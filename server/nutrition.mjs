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
export const nutritionKeys = ['carbs', 'calories', ...Object.keys(nutrientLimits)];
export const known = (value) => typeof value === 'number' && Number.isFinite(value);
export const round = (value) => Math.round(value * 10) / 10;
export const nutritionError = (message) =>
  Object.assign(
    new Error(
      message ||
        'The nutrition estimate was inconsistent. Please retry or enter values from a label.',
    ),
    { status: 502, nutritionError: true },
  );

// Scale per-100 g composition to an edible weight. Unknown nutrients stay unknown, never zero.
export function scaleNutrition(per100g, grams) {
  const result = {};
  for (const key of nutritionKeys)
    if (known(per100g[key])) result[key] = round((per100g[key] * grams) / 100);
  if (known(result.calories)) result.calories = Math.round(result.calories);
  return result;
}

// Consistency problems for one portion. These check numbers; they never recompute carbs.
export function nutritionProblems(item) {
  const problems = [];
  const { carbs, calories, protein, fat, sugar, fiber, addedSugar, saturatedFat, portionGrams } =
    item;
  for (const [key, max] of Object.entries({ carbs: 2000, calories: 20000, ...nutrientLimits }))
    if (item[key] != null && (!known(item[key]) || item[key] < 0 || item[key] > max))
      problems.push(`${key} is out of range`);
  if (problems.length) return problems;
  // Sugar and fiber are already part of total carbohydrate. They must not be added twice.
  if ((sugar ?? 0) + (fiber ?? 0) > carbs + 1) problems.push('sugar and fiber exceed total carbs');
  if (known(addedSugar) && known(sugar) && addedSugar > sugar + 1)
    problems.push('added sugar exceeds sugar');
  if (known(saturatedFat) && (!known(fat) || saturatedFat > fat + 1))
    problems.push('saturated fat exceeds fat');
  if (known(portionGrams) && carbs + (protein ?? 0) + (fat ?? 0) > portionGrams * 1.1 + 2)
    problems.push('macronutrients weigh more than the portion');
  // Broad plausibility guard, allowing fiber, food-specific Atwater factors and label rounding.
  const minimumEnergy = 4 * Math.max(0, carbs - (fiber ?? 0)) + 4 * (protein ?? 0) + 9 * (fat ?? 0);
  if (minimumEnergy > calories * 1.4 + 30) problems.push('calories are too low for the macros');
  if (known(protein) && known(fat) && calories > (4 * carbs + 4 * protein + 9 * fat) * 1.4 + 30)
    problems.push('calories are too high for the macros');
  return problems;
}

export function validRange(range, value, max) {
  return (
    range != null &&
    known(range.min) &&
    known(range.max) &&
    range.min >= 0 &&
    range.max <= max &&
    range.min <= value + 0.05 &&
    range.max >= value - 0.05
  );
}

// Confidence describes the carb number: how wide the plausible interval is, in grams and relative
// to the estimate. Countable or weighed foods come out high; piles, sauces and guesses come out low.
export function carbConfidence(carbs, range, { capped = false, disagreement = false } = {}) {
  if (disagreement) return 'low';
  const half = range ? (range.max - range.min) / 2 : Math.max(5, carbs * 0.3);
  const level =
    half <= Math.max(3, carbs * 0.15)
      ? 'high'
      : half <= Math.max(8, carbs * 0.35)
        ? 'medium'
        : 'low';
  return capped && level === 'high' ? 'medium' : level;
}
