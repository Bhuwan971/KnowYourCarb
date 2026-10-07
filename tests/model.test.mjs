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
