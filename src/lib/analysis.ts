import { photoBase64 } from './photos';
import {
  Alternative,
  Confidence,
  FoodItem,
  FoodRecord,
  nutrientFields,
  Portion,
  Product,
  uid,
} from './model';
import { withAbort } from './abort';
export const analysisUrl =
  process.env.EXPO_PUBLIC_ANALYSIS_URL?.trim().replace(/\/$/, '') || undefined;
// Allow photo preparation/upload in addition to the service's 90-second deadline.
export const scanTimeoutMs = 120_000;
export type Analysis = {
  title: string;
  items: FoodItem[];
  uncertainty: string;
  grounding?: { matched: number; total: number };
};
export type ScanInput = { photo: string; hint?: string } | { text: string; hint?: string };

export function analyzeMeal(input: ScanInput, signal: AbortSignal): Promise<Analysis> {
  return withAbort(signal, () => requestAnalysis(input, signal));
}
export const analyzePhoto = (uri: string, signal: AbortSignal, hint?: string) =>
  analyzeMeal({ photo: uri, hint }, signal);

const notConnected =
  'Photo estimates aren’t connected yet. You can still add carbs from a label and save your snap.';
const finite = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const validRange = (range: unknown, value: number, max: number) => {
  const r = range as { min?: unknown; max?: unknown } | null | undefined;
  return !!r && finite(r.min, 0, max) && finite(r.max, 0, max) && r.min <= value && r.max >= value;
};
const confidences: Confidence[] = ['high', 'medium', 'low'];

function cleanPortions(value: unknown): Portion[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const portions = value
    .filter((p) => p && typeof p.label === 'string' && finite(p.grams, 0.01, 10000))
    .slice(0, 8)
    .map((p) => ({ label: String(p.label).slice(0, 60), grams: p.grams }));
  return portions.length ? portions : undefined;
}

// Accept only well-formed nutrition from the network; anything odd fails loudly instead.
function cleanItem(i: Record<string, unknown>): Alternative | null {
  const carbs = i.carbs;
  if (
    typeof i.name !== 'string' ||
    typeof i.portion !== 'string' ||
    !finite(carbs, 0, 2000) ||
    !finite(i.calories, 0, 20000) ||
    nutrientFields.some(({ key, max }) => i[key] != null && !finite(i[key], 0, max)) ||
    (i.portionGrams != null && !finite(i.portionGrams, 0.01, 10000)) ||
    (i.carbsRange != null && !validRange(i.carbsRange, carbs, 2000))
  )
    return null;
  const per100g =
    i.nutritionPer100g && typeof i.nutritionPer100g === 'object'
      ? Object.fromEntries(
          Object.entries(i.nutritionPer100g as Record<string, unknown>).filter(([, v]) =>
            finite(v, 0, 100000),
          ),
        )
      : undefined;
  return {
    ...Object.fromEntries(
      nutrientFields.flatMap(({ key }) => (typeof i[key] === 'number' ? [[key, i[key]]] : [])),
    ),
    name: i.name.slice(0, 100),
    portion: i.portion.slice(0, 80),
    carbs,
    calories: i.calories as number,
    portionGrams: (i.portionGrams as number | undefined) ?? undefined,
    carbsRange: (i.carbsRange as FoodItem['carbsRange']) ?? undefined,
    nutritionBasis: ['reference', 'label', 'estimate'].includes(i.nutritionBasis as string)
      ? (i.nutritionBasis as FoodItem['nutritionBasis'])
      : 'estimate',
    referenceDescription:
      typeof i.referenceDescription === 'string' ? i.referenceDescription : undefined,
    fdcId: typeof i.fdcId === 'number' ? i.fdcId : undefined,
    dataset: i.dataset === 'fndds' || i.dataset === 'sr' ? i.dataset : undefined,
    nutritionPer100g: per100g as FoodItem['nutritionPer100g'],
    portions: cleanPortions(i.portions),
    confidence: confidences.includes(i.confidence as Confidence)
      ? (i.confidence as Confidence)
      : undefined,
    visibility: ['clear', 'partial', 'assumed'].includes(i.visibility as string)
      ? (i.visibility as FoodItem['visibility'])
      : undefined,
    checks: Array.isArray(i.checks)
      ? i.checks.filter((c): c is string => typeof c === 'string').slice(0, 4)
      : undefined,
  };
}

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function request(path: string, init: RequestInit, signal: AbortSignal) {
  if (!analysisUrl) throw new Error(notConnected);
  let response: Response;
  try {
    response = await fetch(`${analysisUrl}${path}`, { ...init, signal });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error(
      'Couldn’t reach the Carbsy service. Try again when you’re connected, or enter the nutrition yourself.',
    );
  }
  return { response, data: await readJson(response) };
}

async function requestAnalysis(input: ScanInput, signal: AbortSignal): Promise<Analysis> {
  if (!analysisUrl) throw new Error(notConnected);
  const body =
    'photo' in input
      ? { image: await photoBase64(input.photo), mimeType: 'image/jpeg', hint: input.hint }
      : { text: input.text, hint: input.hint };
  if (signal.aborted) throw new Error('Photo scan cancelled.');
  const { response, data } = await request(
    '/analyze',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    signal,
  );
  if (!response.ok)
    throw new Error(
      data.error || 'Couldn’t estimate this meal. Add the carbs yourself or try again.',
    );
  const items = Array.isArray(data.items)
    ? data.items.map((raw: Record<string, unknown>) => {
        const item = cleanItem(raw);
        if (!item) return null;
        const alternatives = Array.isArray(raw.alternatives)
          ? raw.alternatives.map(cleanItem).filter((a: Alternative | null): a is Alternative => !!a)
          : [];
        return {
          ...item,
          id: uid(),
          servings: 1,
          alternatives: alternatives.length ? alternatives : undefined,
        } as FoodItem;
      })
    : [];
  if (
    typeof data.title !== 'string' ||
    typeof data.uncertainty !== 'string' ||
    !items.length ||
    items.some((i: FoodItem | null) => !i)
  )
    throw new Error('The estimate was incomplete. Please try again or add your own values.');
  return {
    title: data.title,
    uncertainty: data.uncertainty,
    items,
    grounding: data.grounding,
  };
}

const validRecord = (food: FoodRecord) =>
  food &&
  typeof food.id === 'number' &&
  typeof food.description === 'string' &&
  food.per100g &&
  finite(food.per100g.carbs, 0, 100.5) &&
  Array.isArray(food.portions);

export async function searchFoods(
  query: string,
  signal: AbortSignal,
): Promise<{ foods: FoodRecord[]; branded: Product[] }> {
  const { response, data } = await request(
    `/foods/search?q=${encodeURIComponent(query.trim())}`,
    {},
    signal,
  );
  if (!response.ok) throw new Error(data.error || 'Food search isn’t available right now.');
  return {
    foods: (Array.isArray(data.foods) ? data.foods : [])
      .filter(validRecord)
      .map((f: FoodRecord) => ({ ...f, portions: cleanPortions(f.portions) ?? [] })),
    branded: (Array.isArray(data.branded) ? data.branded : []).filter(validProduct),
  };
}

const validProduct = (p: Product) =>
  p && typeof p.name === 'string' && p.per100g && finite(p.per100g.carbs, 0, 100.5);

export async function lookupBarcode(code: string, signal: AbortSignal): Promise<Product> {
  const digits = code.replace(/\D/g, '');
  if (!/^\d{6,14}$/.test(digits)) throw new Error('That barcode doesn’t look right.');
  const { response, data } = await request(`/barcode/${digits}`, {}, signal);
  if (!response.ok) throw new Error(data.error || 'We couldn’t look up that barcode.');
  if (!validProduct(data)) throw new Error('That product’s nutrition looked incomplete.');
  return {
    ...data,
    serving: cleanPortions(data.serving ? [data.serving] : [])?.[0] ?? null,
    packageSize: cleanPortions(data.packageSize ? [data.packageSize] : [])?.[0] ?? null,
  };
}
