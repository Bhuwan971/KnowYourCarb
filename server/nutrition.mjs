import { readFileSync } from 'node:fs';

export const reference = JSON.parse(
  readFileSync(new URL('./food-reference.json', import.meta.url)),
);
export const referenceFoods = new Map(reference.foods.map((food) => [food.id, food]));
export const nutrientLimits = {
  protein: 2000,
  fat: 2000,
  sugar: 2000,
  fiber: 2000,
  addedSugar: 2000,
  saturatedFat: 2000,
  sodium: 100000,
  potassium: 100000,
  calcium: 100000,
  iron: 10000,
};
const round = (value) => Math.round(value * 10) / 10;
const fail = () => {
  throw Object.assign(
    new Error(
      'The nutrition estimate was inconsistent. Please retry or enter values from a label.',
    ),
    { status: 502, nutritionError: true },
  );
};
const known = (value) => typeof value === 'number' && Number.isFinite(value);

export function normalizeNutrition(item) {
  const result = { ...item };
  for (const [key, max] of Object.entries(nutrientLimits)) {
    const value = item[key];
    if (value !== undefined && value !== null && (!known(value) || value < 0 || value > max))
      fail();
    delete result[key];
    if (known(value)) result[key] = round(value);
  }
  if (
    item.nutritionBasis !== undefined &&
    !['reference', 'label', 'estimate'].includes(item.nutritionBasis)
  )
    fail();
  if (
    item.portionGrams !== undefined &&
    item.portionGrams !== null &&
    (!known(item.portionGrams) || item.portionGrams <= 0 || item.portionGrams > 10000)
  )
    fail();
  if (item.portionRange != null) {
    const { min, max } = item.portionRange;
    if (
      !known(min) ||
      !known(max) ||
      min <= 0 ||
      max > 10000 ||
      min > item.portionGrams ||
      max < item.portionGrams
    )
      fail();
  }
  if (
    item.unknownNutrients !== undefined &&
    (!Array.isArray(item.unknownNutrients) ||
      item.unknownNutrients.some((key) => !Object.hasOwn(nutrientLimits, key)))
  )
    fail();
  if (item.referenceId != null) {
    const food = referenceFoods.get(item.referenceId);
    if (!food || item.nutritionBasis !== 'reference' || !known(item.portionGrams)) fail();
    // Never apply a plain food profile to an entire coated or mixed dish.
    if (
      /breaded|battered|sandwich|pizza|burger|curry|stew|sauce|glazed|dressing|salad/i.test(
        item.name,
      )
    )
      fail();
    for (const key of ['carbs', 'calories', ...Object.keys(nutrientLimits)]) {
      delete result[key];
      const per100g = food.per100g[key];
      if (known(per100g)) result[key] = round((per100g * item.portionGrams) / 100);
    }
    result.calories = Math.round(result.calories);
    if (item.portionRange)
      result.carbsRange = {
        min: round((food.per100g.carbs * item.portionRange.min) / 100),
        max: round((food.per100g.carbs * item.portionRange.max) / 100),
      };
    // These are generic composition values, never a verification of the photographed recipe.
    result.referenceDescription = food.description;
    result.fdcId = food.fdcId;
    result.nutritionPer100g = { ...food.per100g };
  } else if (item.nutritionBasis === 'reference') fail();
  for (const key of item.unknownNutrients || []) {
    delete result[key];
    if (result.nutritionPer100g) delete result.nutritionPer100g[key];
  }
  delete result.unknownNutrients;
  delete result.portionRange;
  if (result.referenceId == null) delete result.referenceId;
  if (result.portionGrams == null) delete result.portionGrams;
  if (result.carbsRange == null) delete result.carbsRange;

  if (result.carbsRange) {
    const { min, max } = result.carbsRange;
    if (
      !known(min) ||
      !known(max) ||
      min < 0 ||
      max > 2000 ||
      min > result.carbs ||
      max < result.carbs
    )
      fail();
    result.carbsRange = { min: round(min), max: round(max) };
  }
  for (const [key, max] of Object.entries({ carbs: 2000, calories: 20000, ...nutrientLimits })) {
    if (known(result[key]) && (result[key] < 0 || result[key] > max)) fail();
  }
  const { carbs, protein, fat, sugar, fiber, addedSugar, saturatedFat, portionGrams, calories } =
    result;
  // Sugar and fiber are already part of total carbohydrate. They must not be added twice.
  if (
    (sugar ?? 0) + (fiber ?? 0) > carbs + 1 ||
    (known(addedSugar) && known(sugar) && addedSugar > sugar + 1) ||
    (known(saturatedFat) && (!known(fat) || saturatedFat > fat + 1))
  )
    fail();
  if (known(portionGrams) && carbs + (protein ?? 0) + (fat ?? 0) > portionGrams * 1.1 + 2) fail();
  // Broad plausibility guard, allowing fiber, food-specific Atwater factors and label rounding.
  // This checks energy consistency; it never calculates carbohydrate from calories.
  const minimumEnergy = 4 * Math.max(0, carbs - (fiber ?? 0)) + 4 * (protein ?? 0) + 9 * (fat ?? 0);
  if (minimumEnergy > calories * 1.4 + 30) fail();
  if (known(protein) && known(fat) && calories > (4 * carbs + 4 * protein + 9 * fat) * 1.4 + 30)
    fail();
  return result;
}
