import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearSourceCache,
  fromOpenFoodFacts,
  fromUsdaBranded,
  lookupBarcode,
  normalizeBarcode,
  plausiblePer100g,
} from '../server/sources.mjs';

const off = {
  status: 1,
  product: {
    product_name: 'Hazelnut spread',
    brands: 'Example, Other',
    serving_size: '15 g',
    serving_quantity: 15,
    product_quantity: 400,
    quantity: '400 g',
    nutrition_data_per: '100g',
    nutriments: {
      carbohydrates_100g: 57.5,
      'energy-kcal_100g': 539,
      proteins_100g: 6.3,
      fat_100g: 30.9,
      sugars_100g: 56.3,
      'saturated-fat_100g': 10.6,
      sodium_100g: 0.043,
    },
  },
};
const usda = {
  foods: [
    {
      fdcId: 2742723,
      gtinUpc: '00049000028911',
      description: 'DIET COLA CANS',
      brandName: 'EXAMPLE',
      servingSize: 355,
      servingSizeUnit: 'MLT',
      householdServingFullText: '1 Can',
      foodNutrients: [
        { nutrientNumber: '205', value: 0 },
        { nutrientNumber: '208', value: 0 },
        { nutrientNumber: '203', value: 0 },
        { nutrientNumber: '204', value: 0 },
        { nutrientNumber: '307', value: 11 },
      ],
    },
  ],
};

test('Open Food Facts nutriments map to app units; minerals become milligrams', () => {
  const product = fromOpenFoodFacts(off.product, '3017624010701');
  assert.equal(product.name, 'Hazelnut spread');
  assert.equal(product.brand, 'Example');
  assert.equal(product.per100g.carbs, 57.5);
  assert.equal(product.per100g.sodium, 43);
  assert.equal(product.per100g.fiber, undefined);
  assert.deepEqual(product.serving, { label: '15 g', grams: 15 });
  assert.equal(product.unit, 'g');
});

test('USDA branded foods keep label data per 100 ml and tidy shouted names', () => {
  const product = fromUsdaBranded(usda.foods[0], '049000028911');
  assert.equal(product.name, 'Diet Cola Cans');
  assert.equal(product.brand, 'Example');
  assert.equal(product.unit, 'ml');
  assert.deepEqual(product.serving, { label: '1 Can', grams: 355 });
  assert.equal(product.per100g.carbs, 0);
});

test('impossible label data is rejected instead of shown', () => {
  assert.equal(plausiblePer100g({ carbs: 120, calories: 400 }), false);
  assert.equal(plausiblePer100g({ carbs: 10, calories: 40, sugar: 20 }), false);
  assert.equal(plausiblePer100g({ calories: 40 }), false);
  assert.equal(plausiblePer100g({ carbs: 10, calories: 1200 }), false);
  assert.equal(plausiblePer100g({ carbs: 10.4, calories: 41, sugar: 9 }), true);
});

test('barcode lookup prefers USDA label data, falls back to Open Food Facts, and caches', async () => {
  clearSourceCache();
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    if (url.includes('api.nal.usda.gov')) return Response.json(usda);
    return Response.json(off);
  };
  const preferred = await lookupBarcode('049000028911', { fetchImpl, usdaKey: 'key' });
  assert.equal(preferred.source, 'USDA Branded Foods');
  assert.ok(urls.some((u) => u.includes('query=00049000028911')));
  await lookupBarcode('049000028911', { fetchImpl, usdaKey: 'key' });
  assert.equal(urls.length, 2);
  clearSourceCache();
  const fallback = await lookupBarcode('3017624010701', { fetchImpl });
  assert.equal(fallback.source, 'Open Food Facts');
  // Without a USDA key, only Open Food Facts is asked.
  assert.equal(urls.filter((u) => u.includes('api.nal.usda.gov')).length, 1);
});

test('unknown, invalid and unreachable barcodes fail clearly', async () => {
  clearSourceCache();
  assert.equal(normalizeBarcode('12'), null);
  await assert.rejects(lookupBarcode('abc'), { status: 400 });
  const missing = await lookupBarcode('0000000000000', {
    fetchImpl: async () => Response.json({ status: 0 }),
  });
  assert.equal(missing, null);
  clearSourceCache();
  await assert.rejects(
    lookupBarcode('1111111111116', {
      usdaKey: 'key',
      fetchImpl: async () => new Response('down', { status: 503 }),
    }),
    { status: 502 },
  );
});
