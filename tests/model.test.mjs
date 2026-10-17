import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dailyTotal,
  isMeal,
  localDay,
  newMeal,
  totalCarbs,
  totalCalories,
  validateMeal,
} from '../src/lib/model.ts';
const validMeal = () => ({
  ...newMeal(),
  title: 'Lunch',
  items: [{ id: 'rice', name: 'Rice', portion: '100 g', carbs: 28.2, servings: 1.5 }],
});
test('total carbs scales fractional portions and rounds only the final sum', () => {
  assert.equal(
    totalCarbs([
      { carbs: 28.2, servings: 1.5 },
      { carbs: 0.1, servings: 0.5 },
    ]),
    42.4,
  );
});
test('today excludes sample memories and other local days', () => {
  const today = validMeal();
  const sample = { ...today, id: 'demo', source: 'sample' };
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = { ...today, id: 'old', createdAt: yesterdayDate.toISOString() };
  assert.equal(dailyTotal([today, sample, yesterday]), 42.3);
  assert.notEqual(localDay(yesterdayDate), localDay(new Date()));
});
test('blank numbers, negative carbs, missing names, and zero portions cannot be saved', () => {
  assert.ok(validateMeal(newMeal()));
  for (const patch of [
    { carbs: NaN },
    { carbs: -1 },
    { servings: 0 },
    { servings: Infinity },
    { name: '' },
    { portion: '' },
  ]) {
    const meal = validMeal();
    Object.assign(meal.items[0], patch);
    assert.ok(validateMeal(meal));
    assert.equal(isMeal(meal), false);
  }
});
test('zero-carbohydrate food is valid, unlike missing carbohydrate information', () => {
  const meal = validMeal();
  meal.items[0].carbs = 0;
  assert.equal(validateMeal(meal), null);
  assert.equal(isMeal(meal), true);
  const unreadable = { ...meal, createdAt: 'invalid' };
  assert.equal(isMeal(unreadable), false);
});
test('calories scale with portions and incomplete calorie totals stay unknown', () => {
  assert.equal(
    totalCalories([
      { calories: 111, servings: 1.5 },
      { calories: 67, servings: 0.5 },
    ]),
    200,
  );
  assert.equal(totalCalories([{ calories: 0, servings: 1 }]), 0);
  assert.equal(totalCalories([{ calories: 111, servings: 1 }, { servings: 1 }]), null);
  assert.equal(totalCalories([]), null);
});
test('old journals load without calories; invalid supplied calories cannot save', () => {
  assert.equal(isMeal(validMeal()), true);
  for (const calories of [NaN, -1, Infinity, null, '111', 20001]) {
    const meal = validMeal();
    meal.items[0].calories = calories;
    assert.ok(validateMeal(meal));
    assert.equal(isMeal(meal), false);
  }
});

test('extra nutrients scale with servings, preserve zero and require complete totals', async () => {
  const { totalNutrient, totalCarbsRange } = await import('../src/lib/model.ts');
  assert.equal(totalNutrient([{ sugar: 0, servings: 2 }], 'sugar'), 0);
  assert.equal(totalNutrient([{ sugar: 4, servings: 1.5 }, { servings: 1 }], 'sugar'), null);
  assert.equal(
    totalNutrient(
      [
        { protein: 31, servings: 1.5 },
        { protein: 6.3, servings: 1 },
      ],
      'protein',
    ),
    52.8,
  );
  assert.deepEqual(totalCarbsRange([{ carbsRange: { min: 20, max: 30 }, servings: 1.5 }]), {
    min: 30,
    max: 45,
  });
  assert.equal(totalCarbsRange([{ carbs: 20, servings: 1 }]), null);
});

test('confirmed weight scales known nutrition consistently without rounding drift or inventing micros', async () => {
  const { withPortionWeight } = await import('../src/lib/model.ts');
  let item = {
    ...validMeal().items[0],
    carbs: 28.2,
    calories: 130,
    protein: 2.69,
    portionGrams: 100,
    carbsRange: { min: 20, max: 35 },
  };
  for (const grams of [1, 15, 150, 100]) item = withPortionWeight(item, grams);
  assert.equal(item.carbs, 28.2);
  assert.equal(item.calories, 130);
  assert.equal(item.sodium, undefined);
  assert.equal(item.carbsRange, undefined);
  assert.equal(item.servings, 1.5);
  assert.equal(withPortionWeight(item, 0), item);
});

test('journals accept absent nutrients but reject malformed or inconsistent supplied values', () => {
  for (const patch of [
    { sugar: -1 },
    { sodium: '100' },
    { iron: null },
    { fat: Infinity },
    { sugar: 30 },
    { sugar: 4, addedSugar: 10 },
    { fat: 3, saturatedFat: 5 },
    { portionGrams: -10 },
  ]) {
    const meal = validMeal();
    Object.assign(meal.items[0], patch);
    assert.ok(validateMeal(meal));
    assert.equal(isMeal(meal), false);
  }
});

test('USDA household picks and identity swaps recompute nutrition from per-100 g data', async () => {
  const { itemFromFood, withHouseholdPortion, withIdentity, mealConfidence } =
    await import('../src/lib/model.ts');
  const food = {
    id: 1,
    description: 'Rice, white, cooked',
    dataset: 'fndds',
    per100g: { carbs: 28, calories: 129, protein: 2.67 },
    portions: [{ label: '1 cup, cooked', grams: 163 }],
  };
  const rice = itemFromFood(food);
  assert.equal(rice.carbs, 45.6);
  assert.equal(rice.portionGrams, 163);
  const more = withHouseholdPortion(rice, food.portions[0], 1.5);
  assert.equal(more.carbs, 68.5);
  assert.equal(more.portionGrams, 244.5);
  assert.ok(more.carbsRange.min < more.carbs && more.carbsRange.max > more.carbs);
  assert.equal(mealConfidence([more]), 'high');
  const cola = {
    ...rice,
    name: 'Cola',
    carbs: 39,
    alternatives: [
      { ...rice, name: 'Diet cola', carbs: 1, nutritionPer100g: { carbs: 0.3 }, portionGrams: 163 },
    ],
  };
  const diet = withIdentity(cola, cola.alternatives[0]);
  assert.equal(diet.name, 'Diet cola');
  assert.equal(diet.id, cola.id);
  assert.equal(diet.alternatives[0].name, 'Cola');
  // Swapping back restores the original.
  assert.equal(withIdentity(diet, diet.alternatives[0]).carbs, 39);
});

test('barcode products default to their serving, and repeat foods come from real meals only', async () => {
  const { itemFromProduct, recentFoods } = await import('../src/lib/model.ts');
  const item = itemFromProduct({
    name: 'Granola',
    brand: 'Oat Co',
    source: 'Open Food Facts',
    code: '123456789012',
    unit: 'g',
    per100g: { carbs: 64, calories: 450, sugar: 20 },
    serving: { label: '45 g', grams: 45 },
    packageSize: null,
  });
  assert.equal(item.name, 'Oat Co Granola');
  assert.equal(item.carbs, 28.8);
  assert.equal(item.nutritionBasis, 'label');
  assert.equal(item.confidence, 'high');
  const meal = { ...newMeal(), title: 'Breakfast', items: [{ ...item, servings: 2 }] };
  const sample = { ...meal, id: 's', source: 'sample', items: [{ ...item, name: 'Sample' }] };
  const [repeat] = recentFoods([meal, sample]);
  assert.equal(repeat.name, 'Oat Co Granola');
  assert.equal(repeat.servings, 1);
  assert.notEqual(repeat.id, item.id);
  assert.equal(recentFoods([meal, sample], 'sample').length, 0);
});
