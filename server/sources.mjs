// External label databases. Both report nutrients per 100 g (or per 100 ml for drinks).
// USDA Branded Foods holds manufacturer-submitted label data; Open Food Facts is crowdsourced.
const USER_AGENT = 'Carbsy/1.0 (local development; https://github.com/)';
const usdaNumbers = {
  carbs: '205',
  calories: '208',
  protein: '203',
  fat: '204',
  sugar: '269',
  fiber: '291',
  addedSugar: '539',
  saturatedFat: '606',
  sodium: '307',
  potassium: '306',
  calcium: '301',
  iron: '303',
};
// Open Food Facts stores minerals in grams per 100 g; the app uses milligrams.
const offFields = {
  carbs: ['carbohydrates_100g', 1],
  calories: ['energy-kcal_100g', 1],
  protein: ['proteins_100g', 1],
  fat: ['fat_100g', 1],
  sugar: ['sugars_100g', 1],
  fiber: ['fiber_100g', 1],
  addedSugar: ['added-sugars_100g', 1],
  saturatedFat: ['saturated-fat_100g', 1],
  sodium: ['sodium_100g', 1000],
  potassium: ['potassium_100g', 1000],
  calcium: ['calcium_100g', 1000],
  iron: ['iron_100g', 1000],
};
const known = (value) => typeof value === 'number' && Number.isFinite(value);
const round = (value, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

export function normalizeBarcode(code) {
  const digits = String(code ?? '').replace(/\D/g, '');
  return /^\d{8,14}$/.test(digits) ? digits : null;
}

// Reject impossible composition rather than showing confidently wrong label data.
export function plausiblePer100g(per100g) {
  const { carbs, calories, protein = 0, fat = 0, sugar = 0, fiber = 0, addedSugar } = per100g;
  if (!known(carbs) || !known(calories)) return false;
  if ([carbs, protein, fat, sugar, fiber].some((v) => v < 0 || v > 100.5)) return false;
  if (carbs + protein + fat > 105 || calories > 950 || calories < 0) return false;
  if (sugar > carbs + 1 || (known(addedSugar) && addedSugar > sugar + 1)) return false;
  return true;
}

// USDA branded descriptions are often SHOUTED; keep the label readable.
function tidyName(text) {
  const value = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
  return value === value.toUpperCase()
    ? value.toLowerCase().replace(/(^|[\s(/-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase())
    : value;
}

function servingFrom(grams, label, unit) {
  if (!known(grams) || grams <= 0 || grams > 5000) return null;
  return { label: label?.trim() || `${round(grams, 0)} ${unit}`, grams: round(grams, 1) };
}

export function fromOpenFoodFacts(product, code) {
  const n = product?.nutriments;
  if (!n) return null;
  const per100g = {};
  for (const [key, [field, factor]] of Object.entries(offFields)) {
    let value = n[field];
    if (key === 'calories' && !known(value) && known(n['energy-kj_100g']))
      value = n['energy-kj_100g'] / 4.184;
    if (known(value)) per100g[key] = round(value * factor);
  }
  if (!plausiblePer100g(per100g)) return null;
  const unit = /ml/i.test(product.nutrition_data_per || product.serving_quantity_unit || '')
    ? 'ml'
    : 'g';
  const name = tidyName(product.product_name);
  if (!name) return null;
  return {
    code,
    name: name.slice(0, 100),
    brand: tidyName(product.brands?.split(',')[0]) || undefined,
    source: 'Open Food Facts',
    sourceId: code,
    unit,
    per100g,
    serving: servingFrom(Number(product.serving_quantity), product.serving_size, unit),
    packageSize: servingFrom(Number(product.product_quantity), product.quantity, unit),
  };
}

export function fromUsdaBranded(food, code) {
  if (!food?.foodNutrients) return null;
  const per100g = {};
  for (const [key, number] of Object.entries(usdaNumbers)) {
    const nutrient = food.foodNutrients.find(
      (n) => String(n.nutrientNumber ?? n.nutrient?.number) === number,
    );
    const value = nutrient?.value ?? nutrient?.amount;
    if (known(value)) per100g[key] = round(value);
  }
  if (!plausiblePer100g(per100g)) return null;
  const unit = /ml|mlt/i.test(food.servingSizeUnit || '') ? 'ml' : 'g';
  const name = tidyName(food.description);
  if (!name) return null;
  return {
    code,
    name: name.slice(0, 100),
    brand: tidyName(food.brandName || food.brandOwner) || undefined,
    source: 'USDA Branded Foods',
    sourceId: food.fdcId,
    unit,
    per100g,
    serving: servingFrom(Number(food.servingSize), food.householdServingFullText, unit),
    packageSize: null,
  };
}

async function getJson(url, { fetchImpl, signal, headers = {} }) {
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT, ...headers },
    signal,
  });
  if (response.status === 404) return null;
  if (!response.ok) throw Object.assign(new Error(`Lookup failed (${response.status})`), {});
  return response.json();
}

async function openFoodFacts(code, options) {
  const fields =
    'code,product_name,brands,quantity,product_quantity,serving_size,serving_quantity,serving_quantity_unit,nutrition_data_per,nutriments';
  const data = await getJson(
    `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${fields}`,
    options,
  );
  return data?.status === 1 ? fromOpenFoodFacts(data.product, code) : null;
}

async function usdaByGtin(code, { usdaKey, ...options }) {
  if (!usdaKey) return null;
  const gtin = code.padStart(14, '0');
  const data = await getJson(
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(usdaKey)}&dataType=Branded&pageSize=5&query=${gtin}`,
    options,
  );
  const food = data?.foods?.find((f) => String(f.gtinUpc || '').padStart(14, '0') === gtin);
  return food ? fromUsdaBranded(food, code) : null;
}

const cache = new Map();
export function clearSourceCache() {
  cache.clear();
}
function remember(key, value) {
  cache.set(key, { value, at: Date.now() });
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return value;
}

// Query both databases at once; prefer manufacturer label data, fall back to Open Food Facts.
export async function lookupBarcode(code, { fetchImpl = fetch, signal, usdaKey } = {}) {
  const normalized = normalizeBarcode(code);
  if (!normalized)
    throw Object.assign(new Error('That barcode doesn’t look right. Try scanning again.'), {
      status: 400,
    });
  const hit = cache.get(normalized);
  if (hit && Date.now() - hit.at < 6 * 3600_000) return hit.value;
  const options = { fetchImpl, signal, usdaKey };
  const [usda, off] = await Promise.allSettled([
    usdaByGtin(normalized, options),
    openFoodFacts(normalized, options),
  ]);
  signal?.throwIfAborted();
  const product =
    (usda.status === 'fulfilled' && usda.value) || (off.status === 'fulfilled' && off.value);
  if (product) return remember(normalized, product);
  if (usda.status === 'rejected' && off.status === 'rejected')
    throw Object.assign(new Error('The food databases couldn’t be reached. Try again soon.'), {
      status: 502,
    });
  return remember(normalized, null);
}

export async function searchBranded(query, { fetchImpl = fetch, signal, usdaKey, limit = 5 }) {
  if (!usdaKey || !query.trim()) return [];
  const data = await getJson(
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(usdaKey)}&dataType=Branded&pageSize=${limit}&query=${encodeURIComponent(query)}`,
    { fetchImpl, signal },
  );
  return (data?.foods || []).map((food) => fromUsdaBranded(food, food.gtinUpc)).filter(Boolean);
}
