import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAnalysis, estimate } from '../server/analysis.mjs';
import { referenceFoods } from '../server/nutrition.mjs';
const response = (items) => ({
  title: 'Lunch',
  items,
  uncertainty: 'Portions and seasoning are estimated.',
});
const matched = (id, grams, overrides = {}) => ({
  name: 'Plain food',
  portion: `${grams} g`,
  portionGrams: grams,
  portionRange: { min: grams * 0.8, max: grams * 1.2 },
  carbsRange: null,
  carbs: 156,
  calories: 624,
  protein: null,
  fat: null,
  referenceId: id,
  nutritionBasis: 'reference',
  unknownNutrients: ['sodium'],
  ...overrides,
});

test('protein-heavy foods use composition and edible weight, never food weight or calories as carbs', () => {
  const result = validateAnalysis(
    response([
      matched('beef-stew-braised', 180, { name: 'Braised beef meat' }),
      matched('egg-hard-boiled', 50, { name: 'Boiled egg' }),
      matched('white-rice-cooked', 100, { name: 'Cooked rice' }),
    ]),
  );
  assert.deepEqual(
    result.items.map((i) => i.carbs),
    [0, 0.6, 28.2],
  );
  assert.equal(result.items[0].protein, 58.3);
  assert.equal(result.items[0].sodium, undefined);
  assert.equal(result.items[0].nutritionPer100g.sodium, undefined);
  assert.equal(result.items[0].fdcId, 171203);
  assert.deepEqual(result.items[2].carbsRange, { min: 22.6, max: 33.8 });
});

test('injera is an edible carbohydrate base and scales to its weight separately from toppings', () => {
  const [bread] = validateAnalysis(response([matched('injera', 150, { name: 'Injera' })])).items;
  assert.equal(bread.carbs, 29.1);
  assert.equal(bread.calories, 140);
  assert.equal(bread.fdcId, 2707796);
});

test('missing reference nutrients remain unknown; tofu sugar and added sugars are not invented', () => {
  const [tofu] = validateAnalysis(
    response([matched('tofu-firm-calcium', 100, { sugar: 15, addedSugar: 10 })]),
  ).items;
  assert.equal(tofu.sugar, undefined);
  assert.equal(tofu.addedSugar, undefined);
});

test('labels keep readable values without database replacement or inferred micros', () => {
  const item = {
    name: 'Yogurt',
    portion: '1 container',
    carbs: 15,
    calories: 160,
    protein: 12,
    fat: 6,
    sugar: 12,
    fiber: 0,
    addedSugar: null,
    sodium: null,
    referenceId: null,
    nutritionBasis: 'label',
    portionGrams: null,
    portionRange: null,
    carbsRange: null,
  };
  const [label] = validateAnalysis(response([item])).items;
  assert.equal(label.carbs, 15);
  assert.equal(label.sugar, 12);
  assert.equal(label.addedSugar, undefined);
  assert.equal(label.sodium, undefined);
  assert.equal(label.fdcId, undefined);
});

test('invalid nutrient units, impossible mass/energy and subset violations are rejected', () => {
  const base = {
    name: 'Meal',
    portion: '100 g',
    carbs: 20,
    calories: 200,
    protein: 10,
    fat: 9,
    portionGrams: 100,
  };
  for (const patch of [
    { sugar: '10' },
    { sodium: -1 },
    { protein: Infinity },
    { sugar: 15, fiber: 10 },
    { sugar: 5, addedSugar: 10 },
    { fat: 5, saturatedFat: 10 },
    { carbs: 156 },
    { calories: 10 },
    { calories: 1000 },
    { carbsRange: { min: 30, max: 40 } },
    { portionRange: { min: 110, max: 120 } },
    { referenceId: 'invented', nutritionBasis: 'reference' },
  ])
    assert.throws(() => validateAnalysis(response([{ ...base, ...patch }])), {
      nutritionError: true,
    });
  assert.throws(() =>
    validateAnalysis(
      response([matched('chicken-breast-roasted', 100, { name: 'Breaded chicken' })]),
    ),
  );
});

test('one correction pass repairs inconsistent estimates; a second failure is returned', async () => {
  for (const repaired of [true, false]) {
    let calls = 0;
    const invalid = response([
      {
        name: 'Chicken',
        portion: '100 g',
        carbs: 156,
        calories: 624,
        protein: 31,
        fat: 4,
        portionGrams: 100,
      },
    ]);
    const run = estimate('image', {
      provider: 'openrouter',
      apiKey: 'test',
      model: 'vision-model',
      fetchImpl: async (_, options) => {
        calls++;
        if (calls === 2)
          assert.match(
            JSON.parse(options.body).messages[1].content[0].text,
            /failed consistency checks/,
          );
        return Response.json({
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content: JSON.stringify(
                  calls === 2 && repaired
                    ? response([matched('chicken-breast-roasted', 100)])
                    : invalid,
                ),
              },
            },
          ],
        });
      },
    });
    if (repaired) assert.equal((await run).items[0].carbs, 0);
    else await assert.rejects(run, { nutritionError: true });
    assert.equal(calls, 2);
  }
});

test('the correction pass shares the original deadline instead of starting a new timer', async () => {
  const signals = [];
  const invalid = response([
    {
      name: 'Chicken',
      portion: '100 g',
      carbs: 156,
      calories: 624,
      protein: 31,
      fat: 4,
      portionGrams: 100,
    },
  ]);
  await assert.rejects(
    estimate('image', {
      provider: 'openrouter',
      apiKey: 'test',
      model: 'vision-model',
      timeoutMs: 40,
      fetchImpl: async (_, options) => {
        signals.push(options.signal);
        if (signals.length === 2) return new Promise(() => {});
        return Response.json({
          choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(invalid) } }],
        });
      },
    }),
    { name: 'TimeoutError' },
  );
  assert.equal(signals.length, 2);
  assert.equal(signals[0], signals[1]);
  assert.equal(signals[1].aborted, true);
});

test('reference catalog entries contain physically consistent nutrition and source identities', () => {
  for (const [id, food] of referenceFoods) {
    const { carbs, protein, fat, sugar, fiber } = food.per100g;
    assert.ok(Number.isInteger(food.fdcId));
    assert.ok(carbs + protein + fat <= 101, id);
    assert.ok((sugar ?? 0) + (fiber ?? 0) <= carbs + 1, id);
    assert.doesNotThrow(() => validateAnalysis(response([matched(id, 100)])));
  }
});
