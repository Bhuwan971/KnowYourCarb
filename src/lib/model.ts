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
  carbsRange?: { min: number; max: number };
  nutritionBasis?: 'reference' | 'label' | 'estimate';
  referenceId?: string;
  referenceDescription?: string;
  fdcId?: number;
  nutritionPer100g?: Partial<Record<'carbs' | 'calories' | NutrientKey, number>>;
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
};
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
export function totalCarbsRange(items: FoodItem[]): { min: number; max: number } | null {
  if (!items.length || !items.every((item) => item.carbsRange)) return null;
  return {
    min: round(items.reduce((sum, item) => sum + item.carbsRange!.min * item.servings, 0)),
    max: round(items.reduce((sum, item) => sum + item.carbsRange!.max * item.servings, 0)),
  };
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
