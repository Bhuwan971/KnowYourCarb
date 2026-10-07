import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dailyTotal,
  isMeal,
  localDay,
  newMeal,
  totalCarbs,
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
