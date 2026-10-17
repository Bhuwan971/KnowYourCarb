// UI development without AI credits: the photo service with a canned "AI" for perception and
// matching. Database search, USDA grounding, barcode lookups and validation are all real.
// Run: node scripts/mock-service.mjs, then EXPO_PUBLIC_ANALYSIS_URL=http://localhost:3001 npx expo start --web
import { createApp } from '../server/index.mjs';

const item = (overrides) => ({
  preparation: 'unknown',
  visibility: 'clear',
  household: null,
  portionRange: null,
  nutritionBasis: 'estimate',
  sugar: null,
  fiber: null,
  addedSugar: null,
  saturatedFat: null,
  sodium: null,
  potassium: null,
  calcium: null,
  iron: null,
  carbsRange: null,
  alternatives: [],
  ...overrides,
});
const plate = {
  title: 'Curry night',
  uncertainty:
    'Rice amount and the curry’s sauce are the main unknowns; the drink could be regular or diet.',
  items: [
    item({
      name: 'Steamed white rice',
      search: 'rice, white, cooked',
      visibility: 'partial',
      portion: 'about 1 cup',
      household: { quantity: 1, unit: 'cup' },
      portionGrams: 170,
      portionRange: { min: 120, max: 230 },
      carbs: 48,
      calories: 220,
      protein: 4,
      fat: 0.5,
    }),
    item({
      name: 'Chicken curry',
      search: 'chicken curry',
      preparation: 'in sauce',
      portion: 'about 1 cup',
      household: { quantity: 1, unit: 'cup' },
      portionGrams: 240,
      portionRange: { min: 180, max: 300 },
      carbs: 12,
      calories: 330,
      protein: 28,
      fat: 18,
    }),
    item({
      name: 'Naan',
      search: 'bread, naan',
      portion: '1 piece',
      household: { quantity: 1, unit: 'piece' },
      portionGrams: 90,
      portionRange: { min: 75, max: 105 },
      carbs: 45,
      calories: 262,
      protein: 8,
      fat: 5,
    }),
    item({
      name: 'Cola',
      search: 'soft drink, cola',
      portion: '1 can',
      household: { quantity: 1, unit: 'can' },
      portionGrams: 368,
      portionRange: { min: 355, max: 375 },
      carbs: 39,
      calories: 150,
      protein: 0,
      fat: 0,
      alternatives: [{ name: 'Diet cola', search: 'soft drink, cola, diet' }],
    }),
  ],
};

const reply = (data) =>
  Response.json({
    choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(data) } }],
  });

async function fetchImpl(url, options) {
  if (!String(url).includes('openrouter.ai')) return fetch(url, options);
  const body = JSON.parse(options.body);
  await new Promise((resolve) => setTimeout(resolve, 1800));
  if (body.response_format.json_schema.name === 'usda_match') {
    // Pick each query's first candidate and its first matching household label.
    const text = body.messages[1].content[0].text;
    const matches = [];
    let current;
    for (const line of text.split('\n')) {
      const query = line.match(/^Query (\S+): .+\((\d+(?:\.\d+)?) (\w+)/);
      const plain = line.match(/^Query (\S+):/);
      if (plain) {
        current = { key: plain[1], quantity: Number(query?.[2]), unit: query?.[3] };
        matches.push({ key: current.key, fdcId: null, portionLabel: null, portionQuantity: null });
        continue;
      }
      const candidate = line.match(/^ {2}- fdcId (\d+) .+\| portions: (.*)$/);
      const match = matches.at(-1);
      if (!candidate || !match || match.fdcId) continue;
      match.fdcId = Number(candidate[1]);
      const label = [...candidate[2].matchAll(/"([^"]+)"/g)]
        .map((m) => m[1])
        .find((l) => current.unit && l.startsWith(`1 ${current.unit}`));
      if (label) Object.assign(match, { portionLabel: label, portionQuantity: current.quantity });
    }
    return reply({ matches });
  }
  return reply(plate);
}

const port = Number(process.env.PORT || 3001);
createApp({
  apiKey: 'mock',
  provider: 'openrouter',
  model: 'mock',
  fetchImpl,
  usdaKey: process.env.USDA_API_KEY,
}).listen(port, '0.0.0.0', () =>
  console.log(`Carbsy mock service (canned AI, real USDA data): http://localhost:${port}`),
);
