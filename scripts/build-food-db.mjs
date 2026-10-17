#!/usr/bin/env node
// Builds server/data/usda-foods.json from USDA FoodData Central CSV exports.
// Usage: node scripts/build-food-db.mjs --fndds <dir> --sr <dir> --out server/data/usda-foods.json
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const NUTRIENTS = [
  ['carbs', ['205']],
  ['calories', ['208']],
  ['protein', ['203']],
  ['fat', ['204']],
  ['sugar', ['269', '269.3']],
  ['fiber', ['291']],
  ['saturatedFat', ['606']],
  ['sodium', ['307']],
  ['potassium', ['306']],
  ['calcium', ['301']],
  ['iron', ['303']],
];
const MAX_PORTIONS = 8;
const QNS = 'quantity not specified';
// SR Legacy food_category ids: Baby Foods, Branded Food Products Database, Quality Control Materials.
const SR_SKIP_CATEGORIES = new Set(['3', '26', '27']);
const SR_SKIP_DESCRIPTION = /\bindustrial\b|^leavening agents\b/i;

const DATASETS = {
  fndds: {
    name: 'Food and Nutrient Database for Dietary Studies (FNDDS) 2021-2023 (Survey Foods)',
    version: '2024-10-31',
    url: 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_survey_food_csv_2024-10-31.zip',
  },
  sr: {
    name: 'SR Legacy',
    version: '2018-04',
    url: 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip',
  },
};

// Streaming RFC 4180 CSV parser: quoted fields, "" escapes, embedded commas and newlines.
async function* readCsv(file) {
  let row = [];
  let field = '';
  let quoted = false;
  let afterQuote = false;
  let header = null;
  const emit = function* () {
    row.push(field);
    field = '';
    const r = row;
    row = [];
    if (r.length === 1 && r[0] === '') return;
    if (!header) header = r.map((h) => h.replace(/^﻿/, ''));
    else yield Object.fromEntries(header.map((h, i) => [h, r[i] ?? '']));
  };
  for await (const chunk of createReadStream(file, { encoding: 'utf8', highWaterMark: 1 << 20 })) {
    let start = 0;
    for (let i = 0; i < chunk.length; i++) {
      const c = chunk[i];
      if (quoted) {
        if (c !== '"') continue;
        field += chunk.slice(start, i);
        start = i + 1;
        quoted = false;
        afterQuote = true;
        continue;
      }
      if (c === '"') {
        field += chunk.slice(start, i);
        if (afterQuote) field += '"';
        start = i + 1;
        quoted = true;
        afterQuote = false;
        continue;
      }
      afterQuote = false;
      if (c === ',') {
        field += chunk.slice(start, i);
        row.push(field);
        field = '';
        start = i + 1;
      } else if (c === '\n' || c === '\r') {
        field += chunk.slice(start, i);
        start = i + 1;
        if (c === '\r' && chunk[i + 1] === '\n') {
          i++;
          start++;
        }
        yield* emit();
      }
    }
    field += chunk.slice(start);
  }
  if (field !== '' || row.length) yield* emit();
}

const csvRows = async (file) => {
  const out = [];
  for await (const r of readCsv(file)) out.push(r);
  return out;
};

const round = (v) => {
  if (!Number.isFinite(v)) return null;
  const a = Math.abs(v);
  const d = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3;
  return Number(v.toFixed(d));
};

const fmtAmount = (n) => String(Number(n.toFixed(3)));

function portionLabel(p, kind) {
  if (kind === 'fndds') {
    const d = p.portion_description.replace(/\s+/g, ' ').trim();
    // "Guideline amount per ..." rows are FNDDS coding aids (e.g. milk added to cereal), not servings.
    if (/^guideline amount\b/i.test(d)) return null;
    return /^quantity not specified$/i.test(d) ? QNS : d;
  }
  const amount = Number(p.amount);
  const unit = [p.measure_name, p.modifier.trim()].filter(Boolean).join(' ').replace(/\s+/g, ' ');
  if (!unit) return null;
  return Number.isFinite(amount) && amount > 0 ? `${fmtAmount(amount)} ${unit}` : `1 ${unit}`;
}

async function loadDataset(dir, kind) {
  // food_nutrient.nutrient_id normally references nutrient.id, but the FNDDS 2024-10-31 export
  // stores nutrient_nbr there instead. Ids and numbers never collide, so accept either.
  const nutrientNbr = new Map();
  for (const n of await csvRows(join(dir, 'nutrient.csv'))) {
    const nbr = String(Number(n.nutrient_nbr));
    nutrientNbr.set(n.id, nbr);
    if (!nutrientNbr.has(nbr)) nutrientNbr.set(nbr, nbr);
  }
  const slotByNbr = new Map();
  NUTRIENTS.forEach(([, nbrs], slot) =>
    nbrs.forEach((nbr, rank) => slotByNbr.set(nbr, { slot, rank })),
  );
  const measures = new Map();
  for (const m of await csvRows(join(dir, 'measure_unit.csv'))) {
    if (m.id !== '9999') measures.set(m.id, m.name);
  }

  const foods = new Map();
  for (const f of await csvRows(join(dir, 'food.csv'))) {
    const description = f.description.replace(/\s+/g, ' ').trim();
    if (kind === 'sr') {
      if (f.data_type !== 'sr_legacy_food') continue;
      if (SR_SKIP_CATEGORIES.has(f.food_category_id) || SR_SKIP_DESCRIPTION.test(description))
        continue;
    } else if (f.data_type !== 'survey_fndds_food') continue;
    foods.set(f.fdc_id, {
      id: Number(f.fdc_id),
      description,
      values: Array(NUTRIENTS.length).fill(null),
      ranks: Array(NUTRIENTS.length).fill(Infinity),
      portions: [],
    });
  }

  for await (const fn of readCsv(join(dir, 'food_nutrient.csv'))) {
    const food = foods.get(fn.fdc_id);
    if (!food || fn.amount === '') continue;
    const hit = slotByNbr.get(nutrientNbr.get(fn.nutrient_id));
    if (!hit || hit.rank >= food.ranks[hit.slot]) continue;
    const amount = Number(fn.amount);
    if (!Number.isFinite(amount)) continue;
    food.values[hit.slot] = round(amount);
    food.ranks[hit.slot] = hit.rank;
  }

  for (const p of await csvRows(join(dir, 'food_portion.csv'))) {
    const food = foods.get(p.fdc_id);
    const grams = Number(p.gram_weight);
    if (!food || !(grams > 0)) continue;
    const label = portionLabel({ ...p, measure_name: measures.get(p.measure_unit_id) }, kind);
    if (label) food.portions.push({ seq: Number(p.seq_num) || 0, label, grams: round(grams) });
  }

  const out = [];
  let skipped = 0;
  for (const food of foods.values()) {
    if (food.values[0] == null || food.values[1] == null) {
      skipped++;
      continue;
    }
    food.portions.sort((a, b) => a.seq - b.seq);
    const seen = new Set();
    let portions = food.portions.filter((p) => {
      const key = p.label.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (portions.length > MAX_PORTIONS) {
      const qns = portions.find((p) => p.label === QNS);
      portions = portions.filter((p) => p !== qns).slice(0, qns ? MAX_PORTIONS - 1 : MAX_PORTIONS);
      if (qns) portions.push(qns);
    }
    out.push([
      food.id,
      food.description,
      kind,
      food.values,
      portions.map((p) => [p.label, p.grams]),
    ]);
  }
  out.sort((a, b) => a[0] - b[0]);
  return { foods: out, skipped };
}

const { values: args } = parseArgs({
  options: {
    fndds: { type: 'string' },
    sr: { type: 'string' },
    out: { type: 'string', default: 'server/data/usda-foods.json' },
    'retrieved-at': { type: 'string', default: '2026-10-17' },
  },
});
if (!args.fndds || !args.sr) {
  console.error('Usage: node scripts/build-food-db.mjs --fndds <dir> --sr <dir> [--out <file>]');
  process.exit(1);
}

const fndds = await loadDataset(resolve(args.fndds), 'fndds');
const sr = await loadDataset(resolve(args.sr), 'sr');
const db = {
  source: 'USDA FoodData Central',
  units: 'per 100 g; kcal for calories, mg for sodium/potassium/calcium/iron, g otherwise',
  datasets: Object.entries(DATASETS).map(([key, d]) => ({
    key,
    ...d,
    retrievedAt: args['retrieved-at'],
  })),
  nutrients: NUTRIENTS.map(([name]) => name),
  foods: [...fndds.foods, ...sr.foods],
};
const json = JSON.stringify(db);
const out = resolve(args.out);
await mkdir(dirname(out), { recursive: true });
await writeFile(out, json + '\n');
const missing = (list) =>
  Object.fromEntries(
    db.nutrients
      .map((n, i) => [n, list.filter((f) => f[3][i] == null).length])
      .filter(([, c]) => c),
  );
console.log(
  JSON.stringify(
    {
      out,
      bytes: new TextEncoder().encode(json).length + 1,
      fndds: { foods: fndds.foods.length, skipped: fndds.skipped, missing: missing(fndds.foods) },
      sr: { foods: sr.foods.length, skipped: sr.skipped, missing: missing(sr.foods) },
    },
    null,
    2,
  ),
);
