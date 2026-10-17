// Mock AI provider for both stages. Perception and USDA matching are told apart by the schema name
// (OpenRouter) or schema shape (Gemini), so tests exercise the real grounding code and database.
export function perceptionItem(overrides = {}) {
  return {
    name: 'Food',
    search: 'food',
    preparation: 'unknown',
    visibility: 'clear',
    portion: '100 g',
    household: null,
    portionGrams: 100,
    portionRange: { min: 80, max: 120 },
    nutritionBasis: 'estimate',
    carbs: 20,
    calories: 120,
    protein: 2,
    fat: 1,
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
  };
}
export const perception = (items, extra = {}) => ({
  title: 'Lunch',
  items,
  uncertainty: 'Portions are estimated from the photo.',
  ...extra,
});

// Parse the matching prompt back into queries and their offered candidates.
export function parseMatchPrompt(text) {
  const queries = [];
  for (const line of text.split('\n')) {
    const query = line.match(/^Query (\S+): (.+?) — search "(.+?)"/);
    if (query) queries.push({ key: query[1], name: query[2], search: query[3], candidates: [] });
    const candidate = line.match(/^ {2}- fdcId (\d+) \[(\w+)\] (.+?) \| portions: (.*)$/);
    if (candidate && queries.length)
      queries.at(-1).candidates.push({
        id: Number(candidate[1]),
        description: candidate[3],
        portions: [...candidate[4].matchAll(/"([^"]+)"=([\d.]+) g/g)].map((m) => ({
          label: m[1],
          grams: Number(m[2]),
        })),
      });
  }
  return queries;
}

// Default matcher: first candidate whose description contains the wanted text, else the first one.
export const firstCandidate =
  (want = {}) =>
  (queries) => ({
    matches: queries.map((q) => {
      const rule = want[q.key] ?? want[q.name];
      if (rule === null)
        return { key: q.key, fdcId: null, portionLabel: null, portionQuantity: null };
      const food =
        (rule?.description &&
          q.candidates.find((c) => c.description.toLowerCase().includes(rule.description))) ||
        q.candidates[0];
      const portion = rule?.portion && food?.portions.find((p) => p.label.includes(rule.portion));
      return {
        key: q.key,
        fdcId: rule?.fdcId ?? food?.id ?? null,
        portionLabel: portion?.label ?? null,
        portionQuantity: portion ? (rule.quantity ?? 1) : null,
      };
    }),
  });

const reply = (provider, data) =>
  provider === 'openrouter'
    ? Response.json({
        choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(data) } }],
      })
    : Response.json({
        status: 'completed',
        steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify(data) }] }],
      });

export function fakeProvider({ perceive, match = firstCandidate(), provider = 'openrouter' }) {
  const calls = { perception: [], match: [] };
  const fetchImpl = async (url, options) => {
    const body = JSON.parse(options.body);
    const isMatch =
      provider === 'openrouter'
        ? body.response_format.json_schema.name === 'usda_match'
        : Boolean(body.response_format.schema.properties.matches);
    const text =
      provider === 'openrouter'
        ? body.messages[1].content[0].text
        : body.input.find((part) => part.type === 'text').text;
    if (isMatch) {
      const queries = parseMatchPrompt(text);
      calls.match.push({ body, queries });
      const result = typeof match === 'function' ? await match(queries, body) : match;
      return result instanceof Response ? result : reply(provider, result);
    }
    calls.perception.push({ body, text });
    const result = await perceive(calls.perception.length, body, text);
    return result instanceof Response ? result : reply(provider, result);
  };
  return { fetchImpl, calls, provider };
}
