export type Confidence = 'high' | 'medium' | 'low';
export type Portion = { label: string; grams: number };
export type Per100g = Partial<Record<'carbs' | 'calories' | NutrientKey, number>>;
// Another plausible identity for the same food, already grounded for the same portion.
export type Alternative = Omit<FoodItem, 'id' | 'servings' | 'alternatives'>;
export type FoodItem = {
  id: string;
  name: string;
  portion: string;
  carbs: number;
  calories?: number;
  protein?: number;
  fat?: number;
  sugar?: number;
  fiber?: number;
  addedSugar?: number;
  saturatedFat?: number;
  sodium?: number;
  potassium?: number;
  calcium?: number;
  iron?: number;
  portionGrams?: number;
  // The first estimated amount, so relative portion choices stay anchored to it.
  originalGrams?: number;
  originalPortion?: string;
  carbsRange?: { min: number; max: number };
  nutritionBasis?: 'reference' | 'label' | 'estimate';
  referenceId?: string;
  referenceDescription?: string;
  fdcId?: number;
  nutritionPer100g?: Per100g;
  dataset?: 'fndds' | 'sr';
  // Where label data came from: 'Open Food Facts', 'USDA Branded Foods', or a photo label.
  sourceName?: string;
  barcode?: string;
  brand?: string;
  portions?: Portion[];
  confidence?: Confidence;
  visibility?: 'clear' | 'partial' | 'assumed';
  checks?: string[];
  alternatives?: Alternative[];
  servings: number;
};
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
export type Source = 'manual' | 'label' | 'ai' | 'sample';
export type Meal = {
  id: string;
  title: string;
  photo?: string;
  createdAt: string;
  mealType: MealType;
  items: FoodItem[];
  note: string;
  source: Source;
  uncertainty?: string;
  reviewed: boolean;
  // What the person typed when they described the meal instead of photographing it.
  prompt?: string;
};
export const confidenceRank: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };
// Mirrors the server: confidence describes how tight the carb interval is.
export function carbConfidence(
  carbs: number,
  range: { min: number; max: number } | null,
): Confidence {
  const half = range ? (range.max - range.min) / 2 : Math.max(5, carbs * 0.3);
  return half <= Math.max(3, carbs * 0.15)
    ? 'high'
    : half <= Math.max(8, carbs * 0.35)
      ? 'medium'
      : 'low';
}
export type Settings = { haptics: boolean; goal: number | null; name: string };
export const defaultSettings: Settings = { haptics: true, goal: null, name: '' };
export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export const round = (n: number) =>
  Math.round((n + Number.EPSILON * Math.max(1, Math.abs(n))) * 10) / 10;
export const totalCarbs = (items: FoodItem[]) =>
  round(items.reduce((sum, item) => sum + item.carbs * item.servings, 0));
export const totalCalories = (items: FoodItem[]): number | null =>
  items.length && items.every((item) => Number.isFinite(item.calories))
    ? round(items.reduce((sum, item) => sum + item.calories! * item.servings, 0))
    : null;
export const nutrientFields = [
  { key: 'protein', label: 'Protein', unit: 'g', max: 2000 },
  { key: 'fat', label: 'Fat', unit: 'g', max: 2000 },
  { key: 'sugar', label: 'Sugar', unit: 'g', max: 2000 },
  { key: 'fiber', label: 'Fiber', unit: 'g', max: 2000 },
  { key: 'addedSugar', label: 'Added sugar', unit: 'g', max: 2000 },
  { key: 'saturatedFat', label: 'Saturated fat', unit: 'g', max: 2000 },
  { key: 'sodium', label: 'Sodium', unit: 'mg', max: 100000 },
  { key: 'potassium', label: 'Potassium', unit: 'mg', max: 100000 },
  { key: 'calcium', label: 'Calcium', unit: 'mg', max: 100000 },
  { key: 'iron', label: 'Iron', unit: 'mg', max: 10000 },
] as const;
export type NutrientKey = (typeof nutrientFields)[number]['key'];
export function totalNutrient(items: FoodItem[], key: NutrientKey): number | null {
  return items.length && items.every((item) => Number.isFinite(item[key]))
    ? round(items.reduce((sum, item) => sum + item[key]! * item.servings, 0))
    : null;
}
// Items without a range were entered or weighed by the person and count as exact.
export function totalCarbsRange(items: FoodItem[]): { min: number; max: number } | null {
  if (!items.length || !items.some((item) => item.carbsRange)) return null;
  if (
    !items.every(
      (item) => Number.isFinite(item.servings) && (item.carbsRange || Number.isFinite(item.carbs)),
    )
  )
    return null;
  return {
    min: round(
      items.reduce((sum, item) => sum + (item.carbsRange?.min ?? item.carbs) * item.servings, 0),
    ),
    max: round(
      items.reduce((sum, item) => sum + (item.carbsRange?.max ?? item.carbs) * item.servings, 0),
    ),
  };
}
export function mealConfidence(items: FoodItem[]): Confidence | null {
  const total = totalCarbs(items);
  if (!items.length || !Number.isFinite(total)) return null;
  if (!items.some((item) => item.carbsRange || item.confidence)) return null;
  const range = totalCarbsRange(items);
  // Without any interval (labels, weighed or typed values) the least certain item decides.
  if (!range)
    return items.reduce<Confidence>(
      (low, item) =>
        item.confidence && confidenceRank[item.confidence] < confidenceRank[low]
          ? item.confidence
          : low,
      'high',
    );
  return carbConfidence(total, range);
}
// A confirmed weight scales every known nutrient together; unknown nutrients remain unknown.
export function withPortionWeight(item: FoodItem, grams: number): FoodItem {
  if (!Number.isFinite(grams) || grams <= 0 || !item.portionGrams) return item;
  const nutritionPer100g =
    item.nutritionPer100g ??
    Object.fromEntries(
      (['carbs', 'calories', ...nutrientFields.map(({ key }) => key)] as const).flatMap((key) =>
        Number.isFinite(item[key]) ? [[key, (item[key]! * 100) / item.portionGrams!]] : [],
      ),
    );
  const next = {
    ...item,
    portionGrams: grams,
    portion: `${grams} g`,
    carbsRange: undefined,
    nutritionPer100g,
  };
  next.carbs = round((nutritionPer100g.carbs! * grams) / 100);
  if (Number.isFinite(nutritionPer100g.calories))
    next.calories = Math.round((nutritionPer100g.calories! * grams) / 100);
  for (const { key } of nutrientFields)
    if (Number.isFinite(nutritionPer100g[key]))
      next[key] = round((nutritionPer100g[key]! * grams) / 100);
  return next;
}
// A household measure from USDA is far more reliable than a photo guess, but not a scale reading.
export function withHouseholdPortion(item: FoodItem, portion: Portion, quantity = 1): FoodItem {
  const grams = round(portion.grams * quantity);
  const next = withPortionWeight(item, grams);
  const label = portion.label.replace(/^1\s+/, '');
  next.portion = quantity === 1 ? portion.label : `${quantity} × ${label}`;
  if (Number.isFinite(next.carbs)) {
    const spread = next.carbs * 0.1;
    next.carbsRange = { min: round(next.carbs - spread), max: round(next.carbs + spread) };
    next.confidence = carbConfidence(next.carbs, next.carbsRange);
  }
  next.checks = [];
  return next;
}
// Swap what the food is while keeping how much was eaten.
export function withIdentity(item: FoodItem, alternative: Alternative): FoodItem {
  const { id, servings, alternatives = [], ...previous } = item;
  let next: FoodItem = {
    ...alternative,
    id,
    servings,
    alternatives: [previous, ...alternatives.filter((a) => a.name !== alternative.name)],
  };
  const grams = item.portionGrams;
  if (grams && next.portionGrams && next.nutritionPer100g && grams !== next.portionGrams) {
    const ratio = grams / next.portionGrams;
    const range = next.carbsRange;
    next = { ...withPortionWeight(next, grams), portion: item.portion };
    if (range) next.carbsRange = { min: round(range.min * ratio), max: round(range.max * ratio) };
  }
  return next;
}
export type FoodRecord = {
  id: number;
  description: string;
  dataset: 'fndds' | 'sr';
  per100g: Per100g;
  portions: Portion[];
};
export type Product = {
  code?: string;
  name: string;
  brand?: string;
  source: string;
  sourceId?: string | number;
  unit: 'g' | 'ml';
  per100g: Per100g;
  serving: Portion | null;
  packageSize: Portion | null;
};
function scaled(per100g: Per100g, grams: number) {
  const values: Partial<FoodItem> = {};
  for (const key of ['carbs', 'calories', ...nutrientFields.map(({ key }) => key)] as const)
    if (Number.isFinite(per100g[key])) values[key] = round((per100g[key]! * grams) / 100);
  if (values.calories !== undefined) values.calories = Math.round(values.calories);
  return values;
}
const friendly = (description: string) => {
  const [head, ...rest] = description.split(', ');
  return rest.length ? `${head} (${rest.slice(0, 2).join(', ').toLowerCase()})` : head;
};
// USDA's "quantity not specified" is its typical amount eaten; show it in plain words.
export const portionName = (label: string) =>
  /quantity not specified/i.test(label) ? 'typical serving' : label;
// A sensible starting amount: a regular unit, else USDA's typical serving, never "1 miniature".
export function defaultPortion(food: FoodRecord): Portion {
  const find = (pattern: RegExp) => food.portions.find((p) => pattern.test(p.label));
  const chosen =
    find(/^1 (medium|regular|slice|piece|cup|serving|can|bottle|sandwich|burrito)\b/i) ??
    find(/quantity not specified/i) ??
    food.portions.find((p) => !/miniature|mini\b|small/i.test(p.label)) ??
    food.portions[0];
  return chosen ? { ...chosen, label: portionName(chosen.label) } : { label: '100 g', grams: 100 };
}
export function itemFromFood(food: FoodRecord, portion?: Portion, quantity = 1): FoodItem {
  const chosen = portion ?? defaultPortion(food);
  const base: FoodItem = {
    id: uid(),
    name: friendly(food.description).slice(0, 100),
    portion: chosen.label,
    carbs: 0,
    servings: 1,
    portionGrams: chosen.grams,
    nutritionBasis: 'reference',
    fdcId: food.id,
    referenceDescription: food.description,
    dataset: food.dataset,
    nutritionPer100g: { ...food.per100g },
    portions: food.portions.slice(0, 8),
    ...scaled(food.per100g, chosen.grams),
  };
  return withHouseholdPortion(base, chosen, quantity);
}
export function itemFromProduct(product: Product): FoodItem {
  const serving = product.serving ?? { label: `100 ${product.unit}`, grams: 100 };
  const portions = [
    product.serving,
    { label: `100 ${product.unit}`, grams: 100 },
    product.packageSize && {
      ...product.packageSize,
      label: `whole pack (${product.packageSize.label})`,
    },
  ].filter((p): p is Portion => !!p);
  return {
    id: uid(),
    name: (product.brand && !product.name.toLowerCase().includes(product.brand.toLowerCase())
      ? `${product.brand} ${product.name}`
      : product.name
    ).slice(0, 100),
    portion: serving.label.slice(0, 80),
    carbs: 0,
    servings: 1,
    ...scaled(product.per100g, serving.grams),
    portionGrams: serving.grams,
    nutritionPer100g: { ...product.per100g },
    nutritionBasis: 'label',
    sourceName: product.source,
    barcode: product.code,
    brand: product.brand,
    portions,
    confidence: 'high',
    checks: [],
  };
}
// Foods you have logged before, newest first, so a repeat meal is one tap and exactly as you left it.
export function recentFoods(meals: Meal[], query = '', limit = 6): FoodItem[] {
  const q = query.trim().toLowerCase();
  const seen = new Set<string>();
  const result: FoodItem[] = [];
  for (const meal of meals) {
    if (meal.source === 'sample') continue;
    for (const item of meal.items) {
      const key = item.name.trim().toLowerCase();
      if (!key || seen.has(key) || (q && !key.includes(q))) continue;
      seen.add(key);
      result.push({ ...item, id: uid(), servings: 1 });
      if (result.length >= limit) return result;
    }
  }
  return result;
}
export function localDay(date: string | Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function dailyTotal(meals: Meal[], date = new Date()): number {
  return round(
    meals
      .filter((m) => m.source !== 'sample' && localDay(m.createdAt) === localDay(date))
      .reduce((sum, m) => sum + totalCarbs(m.items), 0),
  );
}
export function validateMeal(meal: Meal): string | null {
  if (!meal.title.trim()) return 'Give this memory a name.';
  if (!meal.items.length) return 'Add at least one food.';
  if (meal.items.some((i) => !i.name.trim() || !i.portion.trim()))
    return 'Add a food name and portion for every item.';
  if (meal.items.some((i) => !Number.isFinite(i.carbs) || i.carbs < 0 || i.carbs > 2000))
    return 'Carbs must be between 0 and 2,000 g per portion.';
  if (
    meal.items.some(
      (i) =>
        i.calories !== undefined &&
        (!Number.isFinite(i.calories) || i.calories < 0 || i.calories > 20000),
    )
  )
    return 'Calories must be between 0 and 20,000 kcal per portion, or left blank.';
  for (const { key, label, unit, max } of nutrientFields) {
    if (
      meal.items.some(
        (item) =>
          item[key] !== undefined &&
          (typeof item[key] !== 'number' ||
            !Number.isFinite(item[key]) ||
            item[key]! < 0 ||
            item[key]! > max),
      )
    )
      return `${label} must be between 0 and ${max.toLocaleString()} ${unit}, or left blank.`;
  }
  if (
    meal.items.some(
      (item) =>
        (item.sugar ?? 0) + (item.fiber ?? 0) > item.carbs + 1 ||
        (item.addedSugar !== undefined &&
          item.sugar !== undefined &&
          item.addedSugar > item.sugar + 1),
    )
  )
    return 'Sugar and fiber must fit within total carbs; added sugar must fit within sugar.';
  if (
    meal.items.some(
      (item) =>
        item.saturatedFat !== undefined &&
        item.fat !== undefined &&
        item.saturatedFat > item.fat + 1,
    )
  )
    return 'Saturated fat must fit within total fat.';
  if (
    meal.items.some(
      (item) =>
        item.portionGrams !== undefined &&
        (typeof item.portionGrams !== 'number' ||
          !Number.isFinite(item.portionGrams) ||
          item.portionGrams <= 0 ||
          item.portionGrams > 10000),
    )
  )
    return 'Portion weight must be greater than 0 and at most 10,000 g.';
  if (
    meal.items.some(
      (item) =>
        item.carbsRange !== undefined &&
        (!Number.isFinite(item.carbsRange.min) ||
          !Number.isFinite(item.carbsRange.max) ||
          item.carbsRange.min < 0 ||
          item.carbsRange.max > 2000 ||
          item.carbsRange.min > item.carbs ||
          item.carbsRange.max < item.carbs),
    )
  )
    return 'The carb range must include the estimated carbs.';
  if (meal.items.some((i) => !Number.isFinite(i.servings) || i.servings <= 0 || i.servings > 100))
    return 'Servings must be greater than 0 and at most 100.';
  return null;
}
export function isMeal(value: unknown): value is Meal {
  if (!value || typeof value !== 'object') return false;
  const m = value as Meal;
  return (
    typeof m.id === 'string' &&
    typeof m.title === 'string' &&
    typeof m.createdAt === 'string' &&
    !Number.isNaN(Date.parse(m.createdAt)) &&
    ['Breakfast', 'Lunch', 'Dinner', 'Snack'].includes(m.mealType) &&
    ['manual', 'label', 'ai', 'sample'].includes(m.source) &&
    typeof m.note === 'string' &&
    typeof m.reviewed === 'boolean' &&
    (m.photo === undefined || typeof m.photo === 'string') &&
    Array.isArray(m.items) &&
    m.items.every(
      (i) =>
        i &&
        typeof i.id === 'string' &&
        typeof i.name === 'string' &&
        typeof i.portion === 'string',
    ) &&
    validateMeal(m) === null
  );
}
export function newMeal(photo?: string): Meal {
  const hour = new Date().getHours();
  return {
    id: uid(),
    title: '',
    photo,
    createdAt: new Date().toISOString(),
    mealType: hour < 11 ? 'Breakfast' : hour < 16 ? 'Lunch' : 'Dinner',
    items: [{ id: uid(), name: '', portion: '1 serving', carbs: NaN, servings: 1 }],
    note: '',
    source: 'manual',
    reviewed: false,
  };
}
export const sourceLabel: Record<Source, string> = {
  manual: 'Your estimate',
  label: 'From a label',
  ai: 'Photo estimate',
  sample: 'Sample memory',
};
export const mealSourceLabel = (meal: Meal) =>
  meal.source === 'ai' && !meal.photo ? 'AI estimate' : sourceLabel[meal.source];
