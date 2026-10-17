// USDA FoodData Central lookup (FNDDS survey foods + SR Legacy), built by scripts/build-food-db.mjs.
// Loaded lazily; a missing data file degrades to an empty database instead of throwing.
import { readFileSync } from 'node:fs';

const DATA_FILE = process.env.FOOD_DB_PATH || new URL('./data/usda-foods.json', import.meta.url);
const STOP = new Set(
  'a an and or of the in on with w to from for as by at nfs ns not than other type made is are be it its no'.split(
    ' ',
  ),
);
// Boilerplate SR Legacy appends to many descriptions; it says nothing about the food.
const BOILERPLATE = /\((includes|formerly)[^)]*\)/gi;
const HEAD_BONUS = [1.5, 1.2];
const FNDDS_BOOST = 1.08;
const OZ = 28.35;
const MASS = { g: 1, gram: 1, kg: 1000, oz: OZ, lb: 453.59, pound: 453.59 };
const VOLUME_ML = { cup: 236.59, tbsp: 14.79, tsp: 4.93, floz: 29.57, ml: 1, l: 1000 };

// Query-side synonyms for common meal words. `self` scales the literal word; alternatives are
// phrases (USDA wording) with a weight. Keys are raw lowercase words with stopwords removed.
const SYNONYMS = {
  fries: { self: 0.5, alts: [['french fries', 1]] },
  chips: {
    self: 0.6,
    alts: [
      ['potato chips', 1],
      ['tortilla chips', 0.8],
    ],
  },
  crisps: { self: 0.3, alts: [['potato chips', 1]] },
  soda: {
    self: 0.8,
    alts: [
      ['soft drink', 1],
      ['carbonated beverage', 0.9],
    ],
  },
  pop: { self: 0.3, alts: [['soft drink', 1]] },
  'soft drink': { alts: [['carbonated beverage', 0.9]] },
  cola: { self: 0.8, alts: [['soft drink cola', 1]] },
  coke: {
    self: 0.2,
    alts: [
      ['soft drink cola', 1],
      ['cola', 0.9],
    ],
  },
  pepsi: {
    self: 0.2,
    alts: [
      ['soft drink cola', 1],
      ['cola', 0.9],
    ],
  },
  oatmeal: { alts: [['oats cooked', 0.9]] },
  porridge: { self: 0.5, alts: [['oatmeal', 1]] },
  toast: { self: 0.7, alts: [['bread toasted', 1]] },
  spaghetti: { alts: [['pasta', 0.85]] },
  pasta: {
    alts: [
      ['spaghetti', 0.9],
      ['macaroni', 0.85],
      ['noodles', 0.8],
    ],
  },
  noodles: { alts: [['pasta', 0.8]] },
  'mac cheese': { alts: [['macaroni cheese', 1]] },
  'tikka masala': { self: 0.3, alts: [['curry', 1]] },
  masala: { self: 0.5, alts: [['curry', 1]] },
  tikka: { self: 0.5, alts: [['curry', 1]] },
  korma: { self: 0.5, alts: [['curry', 1]] },
  vindaloo: { self: 0.5, alts: [['curry', 1]] },
  'butter chicken': { self: 0.5, alts: [['chicken curry', 1]] },
  dal: {
    self: 0.5,
    alts: [
      ['lentil curry', 1],
      ['lentils', 0.9],
    ],
  },
  dahl: {
    self: 0.3,
    alts: [
      ['lentil curry', 1],
      ['lentils', 0.9],
    ],
  },
  daal: {
    self: 0.3,
    alts: [
      ['lentil curry', 1],
      ['lentils', 0.9],
    ],
  },
  ketchup: { self: 0.5, alts: [['catsup', 1]] },
  yoghurt: { self: 0.3, alts: [['yogurt', 1]] },
  donut: { self: 0.5, alts: [['doughnut', 1]] },
  burger: { self: 0.6, alts: [['hamburger', 1]] },
  prawns: { self: 0.5, alts: [['shrimp', 1]] },
  aubergine: { self: 0.3, alts: [['eggplant', 1]] },
  courgette: { self: 0.3, alts: [['zucchini', 1]] },
  garbanzo: { alts: [['chickpeas', 1]] },
  oj: { self: 0.2, alts: [['orange juice', 1]] },
};

// Light suffix stemmer, consistent for both index and query: fries/fried/fry -> fri,
// eggs -> egg, tomatoes -> tomato, berries/berry -> berri, cookies/cookie -> cooki.
export function stem(word) {
  let w = word;
  if (w.length < 3 || /\d/.test(w)) return w;
  if (w.length > 4 && /ie[sd]$/.test(w)) w = w.slice(0, -3) + 'i';
  else if (/(ch|sh|x|z|ss)es$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith('oes')) w = w.slice(0, -2);
  else if (w.length > 3 && /[^su]s$/.test(w)) w = w.slice(0, -1);
  else if (w.length > 3 && /[^e]ed$/.test(w)) w = w.slice(0, -2);
  if (w.length > 2 && w.endsWith('e')) w = w.slice(0, -1);
  else if (w.length > 2 && w.endsWith('y')) w = w.slice(0, -1) + 'i';
  if (w.length > 3 && /([b-df-hj-np-tv-z])\1$/.test(w)) w = w.slice(0, -1);
  return w;
}

const words = (text) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .match(/[a-z0-9]+/g) ?? [];
const tokens = (text) =>
  words(text)
    .filter((w) => !STOP.has(w))
    .map(stem);
const NEGATE = new Set(['no', 'without', 'not', 'non']);
const NOUN_END = new Set(['with', 'from', 'in', 'on', 'for']);
// Tokens of one comma segment. Words after "no"/"without"/"not" are negated ("!chees") so
// "Pizza, no cheese" never matches "cheese pizza". FNDDS "NS as to ..." segments only name
// what is unspecified, so they are neither matchable nor penalized; they and "NFS" mark the
// generic default entry. "from ..." segments name a source (frozen, restaurant) and are soft.
// `noun` is the phrase head: the last word before with/from/in ("spaghetti" in "spaghetti
// with meat sauce", "sauce" in "spaghetti sauce with meat").
function segmentTokens(text) {
  const ws = words(text);
  if (ws[0] === 'ns' && ws[1] === 'as' && ws[2] === 'to')
    return { tokens: [], raw: [], generic: true };
  const tokens = [];
  const raw = [];
  let negated = 0;
  let noun;
  let nounDone = false;
  for (const w of ws) {
    if (NEGATE.has(w)) negated = w === 'non' ? 1 : Infinity;
    else if (w === 'with') negated = 0;
    if (NOUN_END.has(w) && tokens.length) nounDone = true;
    if (STOP.has(w) || w === 'non') continue;
    const t = negated > 0 ? '!' + stem(w) : stem(w);
    tokens.push(t);
    raw.push(negated > 0 ? '!' + w : w);
    if (!nounDone && !negated && !/^\d+$/.test(t)) noun = t;
    if (negated > 0) negated--;
  }
  return { tokens, raw, noun, generic: ws.includes('nfs'), soft: ws[0] === 'from' };
}
// FNDDS component entries ("Topping from cheese pizza", "Sauce as ingredient in ...").
const COMPONENT = /^topping from\b|\bas ingredient\b/i;

let db;
function load() {
  if (db) return db;
  let raw;
  try {
    raw = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn(`USDA food database unavailable: ${error.message}`);
    raw = { nutrients: [], foods: [] };
  }
  db = { nutrients: raw.nutrients, datasets: raw.datasets ?? [], rows: raw.foods, byId: new Map() };
  raw.foods.forEach((row, i) => db.byId.set(row[0], i));
  return db;
}

function buildIndex() {
  const d = load();
  if (d.docs) return d;
  const postings = new Map();
  d.docs = d.rows.map((row, i) => {
    const clean = row[1].replace(BOILERPLATE, ' ');
    const seq = [];
    const segment = new Map();
    const soft = new Set();
    let generic = false;
    let head;
    let noun;
    clean.split(',').forEach((part, s) => {
      const seg = segmentTokens(part);
      generic ||= seg.generic;
      if (!head) [head, noun] = [seg.tokens, seg.noun];
      for (const t of seg.tokens) {
        seq.push(t);
        if (seg.soft) soft.add(t);
        if (!segment.has(t)) segment.set(t, s);
      }
    });
    for (const t of segment.keys()) {
      let list = postings.get(t);
      if (!list) postings.set(t, (list = []));
      list.push(i);
    }
    const key = [...new Set(words(clean).map(stem))].sort().join(' ');
    return { seq, segment, head, noun, soft, key, generic, component: COMPONENT.test(clean) };
  });
  const n = d.rows.length;
  d.postings = postings;
  d.idf = new Map([...postings].map(([t, list]) => [t, Math.log(1 + n / list.length)]));
  d.vocab = [...postings.keys()];
  return d;
}

// Resolve a query token to an indexed one, falling back to the most common prefix completion.
function resolveToken(d, t) {
  if (d.postings.has(t)) return t;
  if (t.length < 3) return null;
  let best = null;
  for (const v of d.vocab)
    if (v.startsWith(t) && (!best || d.postings.get(v).length > d.postings.get(best).length))
      best = v;
  return best;
}

function parseQuery(d, query) {
  const { tokens: stems, raw, noun } = segmentTokens(query.replace(/,/g, ' '));
  const terms = [];
  for (let i = 0; i < raw.length;) {
    let len = Math.min(3, raw.length - i);
    while (len > 1 && !SYNONYMS[raw.slice(i, i + len).join(' ')]) len--;
    const phrase = raw.slice(i, i + len).join(' ');
    const syn = SYNONYMS[phrase];
    const alts = [{ tokens: stems.slice(i, i + len), weight: syn?.self ?? 1, literal: true }];
    for (const [alt, weight] of syn?.alts ?? []) alts.push({ tokens: tokens(alt), weight });
    const usable = alts
      .map((a) => ({ ...a, tokens: a.tokens.map((t) => resolveToken(d, t)).filter(Boolean) }))
      .filter((a) => a.tokens.length);
    for (const a of usable) a.ideal = a.tokens.reduce((sum, t) => sum + d.idf.get(t), 0);
    if (usable.length) {
      const literal = usable.find((a) => a.literal);
      const ideal = literal?.ideal ?? Math.max(...usable.map((a) => a.ideal));
      terms.push({ alts: usable, ideal });
    }
    i += len;
  }
  terms.noun = terms.length > 1 ? noun : undefined;
  return terms;
}

function scoreDoc(d, doc, terms, totalIdeal) {
  const matched = new Set();
  let value = 0;
  let covered = 0;
  const best = [];
  for (const term of terms) {
    let top = { value: 0, frac: 0, tokens: [] };
    for (const alt of term.alts) {
      let plain = 0;
      let boosted = 0;
      const hit = [];
      for (const t of alt.tokens) {
        const s = doc.segment.get(t);
        if (s === undefined) continue;
        const idf = d.idf.get(t);
        plain += idf;
        boosted += idf * (HEAD_BONUS[s] ?? 1);
        hit.push(t);
      }
      if (!hit.length) continue;
      const frac = (plain / alt.ideal) * (hit.length / alt.tokens.length) * alt.weight;
      const v = frac * term.ideal * (boosted / plain);
      if (v > top.value) top = { value: v, frac: Math.min(1, frac), tokens: hit };
    }
    value += top.value;
    covered += top.frac * term.ideal;
    best.push(top.tokens);
    for (const t of top.tokens) matched.add(t);
  }
  if (!value) return 0;
  const coverage = covered / totalIdeal;
  let unmatched = 0;
  for (const t of doc.segment.keys())
    if (!matched.has(t) && !/^\d+$/.test(t))
      unmatched += d.idf.get(t) * (doc.soft.has(t) ? 0.3 : 1);
  // Consecutive query terms that are adjacent in the description: in query order ("spaghetti
  // with meat sauce") counts fully, reversed ("Pizza, cheese" for "cheese pizza") partly.
  let adjacent = 0;
  for (let i = 1; i < best.length; i++) {
    let pair = 0;
    doc.seq.forEach((t, p) => {
      if (!best[i - 1].includes(t)) return;
      if (best[i].includes(doc.seq[p + 1])) pair = 1;
      else if (best[i].includes(doc.seq[p - 1])) pair = Math.max(pair, 0.4);
    });
    adjacent += pair;
  }
  const headCovered = doc.head.length > 0 && doc.head.every((t) => matched.has(t));
  return (
    (value *
      coverage ** 2 *
      (1 + (0.5 * adjacent) / Math.max(1, best.length - 1)) *
      (headCovered ? 1.25 : 1) *
      (doc.generic ? 1.1 : 1) *
      (terms.noun && doc.noun === terms.noun ? 1.3 : 1) *
      (doc.component ? 0.6 : 1)) /
    (1 + 0.035 * unmatched + 0.01 * doc.seq.length)
  );
}

function toFood(d, i) {
  const [id, description, dataset, values, portions] = d.rows[i];
  const per100g = {};
  d.nutrients.forEach((name, n) => {
    if (values[n] != null) per100g[name] = values[n];
  });
  return {
    id,
    description,
    dataset,
    per100g,
    portions: portions.map(([label, grams]) => ({ label, grams })),
  };
}

export function foodCount() {
  return load().rows.length;
}

export function getFood(id) {
  const d = load();
  const i = d.byId.get(Number(id));
  return i === undefined ? undefined : toFood(d, i);
}

export function searchFoods(query, { limit = 8, dataset } = {}) {
  if (typeof query !== 'string' || !query.trim()) return [];
  const d = buildIndex();
  if (!d.rows.length) return [];
  const terms = parseQuery(d, query);
  if (!terms.length) return [];
  const totalIdeal = terms.reduce((sum, t) => sum + t.ideal, 0);
  const candidates = new Set();
  for (const term of terms)
    for (const alt of term.alts)
      for (const t of alt.tokens) for (const i of d.postings.get(t)) candidates.add(i);
  const scored = [];
  for (const i of candidates) {
    if (dataset && d.rows[i][2] !== dataset) continue;
    let score = scoreDoc(d, d.docs[i], terms, totalIdeal);
    if (d.rows[i][2] === 'fndds') score *= FNDDS_BOOST;
    if (score > 0) scored.push([i, score]);
  }
  scored.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const seen = new Set();
  const results = [];
  for (const [i, score] of scored) {
    const key = d.docs[i].key;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ ...toFood(d, i), score: Math.round(score * 1000) / 1000 });
    if (results.length >= limit) break;
  }
  return results;
}

const FRACTIONS = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 };
// Split "1 1/2 cups" into 1.5 and the normalized unit words ["cup"].
function parseMeasure(text) {
  let s = String(text)
    .toLowerCase()
    .replace(/[½¼¾⅓⅔⅛]/g, (c) => ` ${FRACTIONS[c]} `)
    .replace(/"/g, ' in ')
    .trim();
  let amount = null;
  const m = s.match(
    /^(\d+(?:\.\d+)?)\s+(\d+)\/(\d+)|^(\d+)\/(\d+)|^(\d*\.?\d+)\s+(0?\.\d+)|^(\d*\.?\d+)/,
  );
  if (m) {
    if (m[1]) amount = Number(m[1]) + Number(m[2]) / Number(m[3]);
    else if (m[4]) amount = Number(m[4]) / Number(m[5]);
    else if (m[6]) amount = Number(m[6]) + Number(m[7]);
    else amount = Number(m[8]);
    s = s.slice(m[0].length);
  }
  const unit = (part) =>
    part
      .replace(/\bfl(uid)?\.?\s*(ounces?|oz)\b/g, ' floz ')
      .replace(/\b(tablespoons?|tbsps?|tbs|tbl)\b/g, ' tbsp ')
      .replace(/\b(teaspoons?|tsps?)\b/g, ' tsp ')
      .replace(/\b(ounces?|oz)\b/g, ' oz ')
      .replace(/\b(grams?|gm|gr)\b/g, ' g ')
      .replace(/\b(kilograms?|kgs?)\b/g, ' kg ')
      .replace(/\b(pounds?|lbs?)\b/g, ' lb ')
      .replace(/\b(milliliters?|millilitres?|mls?)\b/g, ' ml ')
      .replace(/\b(liters?|litres?)\b/g, ' l ')
      .replace(/\b(servings?|portions?)\b/g, ' serving ');
  const norm = (part) =>
    (unit(part).match(/[a-z0-9]+/g) ?? [])
      .filter((w) => !STOP.has(w))
      .map((w) =>
        ['g', 'kg', 'lb', 'oz', 'ml', 'l', 'tsp', 'tbsp', 'floz'].includes(w) ? w : stem(w),
      );
  return { amount, words: norm(s), main: norm(s.split(/[,(]/)[0]) };
}

const same = (a, b) => a.length === b.length && a.every((w, i) => w === b[i]);
const round1 = (v) => Math.round(v * 10) / 10;

// Grams for `quantity` x `unit` of a food (object from getFood/searchFoods, or an FDC id).
export function gramsFor(food, unit, quantity = 1) {
  const f = typeof food === 'object' && food ? food : getFood(food);
  if (!Number.isFinite(quantity) || quantity < 0 || unit == null) return null;
  const want = parseMeasure(unit);
  const count = (want.amount ?? 1) * quantity;
  if (!want.words.length) return null;
  if (want.words.length === 1 && MASS[want.words[0]]) return round1(MASS[want.words[0]] * count);
  const portions = (f?.portions ?? []).map((p) => ({
    ...parseMeasure(p.label),
    label: p.label,
    grams: p.grams,
  }));
  const isServing = same(want.words, ['serving']);
  let best = null;
  let bestRank = 0;
  for (const p of portions) {
    let rank = 0;
    if (same(p.words, want.words)) rank = 4;
    // FNDDS "1 medium or regular slice" is the typical slice; "1 slice, crust not eaten" is not.
    else if (want.words.every((w) => p.words.includes(w)) && /\b(medium|regular)\b/.test(p.label))
      rank = 3.5;
    else if (same(p.main, want.words)) rank = 3;
    else if (want.words.every((w, i) => p.main[i] === w)) rank = 2;
    else if (want.words.every((w) => p.words.includes(w))) rank = 1;
    if (isServing && same(p.words, ['quantiti', 'specifi'])) rank = 5;
    if (rank > bestRank) [best, bestRank] = [p, rank];
  }
  if (best) return round1((best.grams / (best.amount || 1)) * count);
  // Volume fallback: convert through any plain volume portion (e.g. tbsp from a cup weight).
  const ml = want.words.length === 1 && VOLUME_ML[want.words[0]];
  if (ml) {
    const ref = portions.find((p) => p.main.length === 1 && VOLUME_ML[p.main[0]]);
    if (ref) return round1((ref.grams / (ref.amount || 1) / VOLUME_ML[ref.main[0]]) * ml * count);
  }
  return null;
}
