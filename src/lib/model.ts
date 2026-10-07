export type FoodItem = {
  id: string;
  name: string;
  portion: string;
  carbs: number;
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
