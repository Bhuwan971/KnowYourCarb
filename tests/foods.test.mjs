import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { foodCount, getFood, gramsFor, searchFoods, stem } from '../server/foods.mjs';

// [query, substring expected in one of the top 3 descriptions, optional dataset]
const expectations = [
  ['white rice cooked', 'Rice, white, cooked'],
  ['brown rice', 'Rice, brown, cooked'],
  ['banana', 'Banana, raw'],
  ['cheese pizza', 'Pizza, cheese'],
  ['pepperoni pizza', 'Pizza with pepperoni'],
  ['spaghetti with meat sauce', 'Spaghetti with meat sauce'],
  ['chicken tikka masala', 'Chicken curry'],
  ['scrambled eggs', 'scrambled egg'],
  ['french fries', 'Potato, french fries'],
  ['whole wheat bread', 'Bread, whole wheat'],
  ['bagel', 'Bagel'],
  ['apple', 'Apple, raw'],
  ['orange juice', 'Orange juice'],
  ['cola', 'Soft drink, cola'],
  ['coke', 'Soft drink, cola'],
  ['soda', 'Soft drink'],
  ['fries', 'french fries'],
  ['chips', 'Potato chips'],
  ['toast', 'toasted'],
  ['oatmeal', 'Oatmeal'],
  ['black beans', 'Black beans'],
  ['lentils cooked', 'Lentils'],
  ['tortilla flour', 'Tortilla, flour'],
  ['injera', 'Injera'],
  ['pad thai', 'Pad Thai'],
  ['sushi', 'Sushi'],
  ['greek yogurt', 'Yogurt, Greek'],
  ['milk 2%', 'Milk, reduced fat (2%)'],
  ['chocolate chip cookie', 'Cookie, chocolate chip'],
  ['avocado', 'Avocado'],
  ['tomatoes', 'Tomatoes'],
  ['berries', 'Berries'],
  ['lentils cooked', 'Lentils, mature seeds, cooked', 'sr'],
];

test('meal-logging queries rank the expected USDA food in the top 3', () => {
  assert.ok(foodCount() > 12000);
  for (const [query, expected, dataset] of expectations) {
    const top = searchFoods(query, { limit: 3, dataset }).map((f) => f.description);
    assert.ok(
      top.some((d) => d.toLowerCase().includes(expected.toLowerCase())),
      `${query}: ${JSON.stringify(top)}`,
    );
  }
});

test('ranking prefers the dish over components, negations and look-alikes', () => {
  const first = (q) => searchFoods(q, { limit: 1 })[0].description;
  assert.equal(first('banana'), 'Banana, raw');
  assert.equal(first('bagel'), 'Bagel');
  assert.equal(first('cola'), 'Soft drink, cola');
  assert.equal(first('tortilla flour'), 'Tortilla, flour');
  assert.equal(first('chicken tikka masala'), 'Chicken curry');
  assert.match(first('cheese pizza'), /^Pizza, cheese/);
  assert.match(first('white rice cooked'), /^Rice, white, cooked/);
  assert.match(first('fried chicken'), /^Chicken/);
  const cheesePizza = searchFoods('cheese pizza', { limit: 8 }).map((f) => f.description);
  assert.ok(!cheesePizza.some((d) => /no cheese|^Topping/.test(d)), cheesePizza.join(' | '));
  assert.match(searchFoods('pizza no cheese', { limit: 1 })[0].description, /no cheese/);
  assert.ok(!searchFoods('cola', { limit: 8 }).some((f) => /chocolate milk/i.test(f.description)));
});

test('search results have the food shape, honor dataset and limit, and deduplicate', () => {
  const results = searchFoods('banana', { limit: 5 });
  assert.equal(results.length, 5);
  for (const food of results) {
    assert.deepEqual(Object.keys(food), [
      'id',
      'description',
      'dataset',
      'per100g',
      'portions',
      'score',
    ]);
    assert.ok(food.score > 0);
  }
  assert.ok(results.every((f, i) => i === 0 || f.score <= results[i - 1].score));
  // FNDDS "Banana, raw" and SR "Bananas, raw" are the same food; only one is returned.
  assert.equal(results.filter((f) => /^Bananas?, raw$/.test(f.description)).length, 1);
  assert.ok(searchFoods('banana', { dataset: 'sr' }).every((f) => f.dataset === 'sr'));
  assert.equal(searchFoods('banana', { dataset: 'sr', limit: 1 })[0].description, 'Bananas, raw');
  assert.deepEqual(searchFoods(''), []);
  assert.deepEqual(searchFoods('zzqxv'), []);
});

test('search is fast after the index is built', () => {
  searchFoods('warm up');
  const queries = expectations.map(([q]) => q);
  const start = performance.now();
  for (let i = 0; i < 10; i++) for (const q of queries) searchFoods(q);
  const perQuery = (performance.now() - start) / (queries.length * 10);
  assert.ok(perQuery < 5, `${perQuery.toFixed(2)} ms per query`);
});

test('stemmer folds common plural and cooking forms', () => {
  assert.equal(stem('fries'), stem('fried'));
  assert.equal(stem('fries'), stem('fry'));
  assert.equal(stem('eggs'), stem('egg'));
  assert.equal(stem('tomatoes'), stem('tomato'));
  assert.equal(stem('berries'), stem('berry'));
  assert.equal(stem('cookies'), stem('cookie'));
});

test('getFood returns USDA values per 100 g, with missing nutrients absent rather than zero', () => {
  const injera = getFood(2707796);
  assert.equal(injera.description, 'Injera, Ethiopian bread');
  assert.equal(injera.dataset, 'fndds');
  assert.equal(injera.per100g.carbs, 19.4);
  assert.equal(injera.per100g.calories, 93);
  assert.ok(injera.portions.some((p) => p.label === 'quantity not specified' && p.grams === 127));

  const rice = getFood(168878);
  assert.equal(rice.description, 'Rice, white, long-grain, regular, enriched, cooked');
  assert.equal(rice.dataset, 'sr');
  assert.deepEqual(
    { carbs: rice.per100g.carbs, calories: rice.per100g.calories },
    { carbs: 28.2, calories: 130 },
  );

  // SR Legacy has no sugar, fiber or potassium for this item: keys are omitted, never 0.
  const coating = getFood(167514);
  for (const key of ['sugar', 'fiber', 'saturatedFat', 'potassium', 'calcium', 'iron'])
    assert.equal(key in coating.per100g, false, key);
  assert.equal(coating.per100g.carbs, 79.8);
  assert.equal(getFood(1), undefined);
  assert.equal(getFood('2707796').id, 2707796);
});

test('gramsFor resolves household units against USDA portion weights', () => {
  const rice = getFood(168878);
  assert.equal(gramsFor(rice, 'cup'), 158);
  assert.equal(gramsFor(rice, '1 cup', 2), 316);
  assert.equal(gramsFor(rice, 'cups', 0.5), 79);
  assert.equal(gramsFor(rice, '1/2 cup'), 79);
  assert.equal(gramsFor(rice, 'tbsp'), 9.9);
  assert.equal(gramsFor(rice, 'oz', 2), 56.7);
  assert.equal(gramsFor(rice, 'g', 150), 150);
  assert.equal(gramsFor(rice, 'slice'), null);

  const fnddsRice = getFood(2708408);
  assert.equal(gramsFor(fnddsRice, 'cup'), 158);
  assert.equal(gramsFor(fnddsRice, 'serving'), 118);

  const bread = getFood(2707709);
  assert.equal(gramsFor(bread, 'slice'), 36);
  assert.equal(gramsFor(bread, '2 slices'), 72);
  assert.equal(gramsFor(bread, 'large'), 43);

  // "2 waffles" weighs 70 g, so one waffle is 35 g.
  assert.equal(gramsFor(167524, 'waffle'), 35);
  assert.equal(gramsFor(167524, 'waffles', 3), 105);

  const milk = getFood(2705386);
  assert.equal(gramsFor(milk, 'fl oz', 8), 244);
  assert.equal(gramsFor(milk, 'tablespoon'), 15.3);
  assert.equal(gramsFor(milk, 'Tablespoons', 2), 30.5);
  assert.equal(gramsFor(getFood(173944), 'medium'), 118);
  assert.equal(gramsFor(2707796, 'injera'), 127);
});

test('a missing data file degrades to an empty database', () => {
  const script = `import('./server/foods.mjs').then((m) => console.log(JSON.stringify([
    m.foodCount(), m.searchFoods('rice'), m.getFood(2707796) ?? null, m.gramsFor(2707796, 'cup'),
  ])))`;
  const out = execFileSync(process.execPath, ['-e', script], {
    env: { ...process.env, FOOD_DB_PATH: '/nonexistent/usda-foods.json' },
    encoding: 'utf8',
  });
  assert.deepEqual(JSON.parse(out), [0, [], null, null]);
});
