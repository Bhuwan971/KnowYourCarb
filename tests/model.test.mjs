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
