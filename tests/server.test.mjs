import test from 'node:test';
import { request as httpRequest } from 'node:http';
import assert from 'node:assert/strict';
import { createApp } from '../server/index.mjs';
import { validatePerception, validateImage } from '../server/analysis.mjs';
import { clearSourceCache } from '../server/sources.mjs';
import { fakeProvider, perception, perceptionItem } from './helpers.mjs';
const result = {
  title: 'Quinoa bowl',
  items: [{ name: 'Quinoa', portion: '½ cup', carbs: 20, calories: 111 }],
  uncertainty: 'The portion is approximate; sauce and hidden ingredients may change the carbs.',
};
const quinoa = perceptionItem({
  name: 'Quinoa',
  search: 'quinoa, cooked',
  portion: '½ cup',
  household: { quantity: 0.5, unit: 'cup' },
  portionGrams: 90,
  carbs: 20,
  calories: 111,
  protein: 4,
  fat: 2,
});
const image = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]).toString('base64');
async function withServer(options, task) {
  const app = createApp(options);
  await new Promise((resolve) => app.listen(0, '127.0.0.1', resolve));
  try {
    await task(`http://127.0.0.1:${app.address().port}`);
  } finally {
    await new Promise((resolve) => app.close(resolve));
  }
}
test('missing credentials reports unavailable, never fabricates photo carbs', async () => {
  await withServer({ apiKey: '' }, async (url) => {
    assert.equal((await (await fetch(`${url}/health`)).json()).configured, false);
    const response = await fetch(`${url}/analyze`, { method: 'POST' });
    assert.equal(response.status, 503);
  });
});
test('server proxies the image, disables interaction storage and returns grounded estimates', async () => {
  const fake = fakeProvider({ provider: 'gemini', perceive: () => perception([quinoa]) });
  await withServer(
    { apiKey: 'test-key', provider: 'gemini', fetchImpl: fake.fetchImpl },
    async (url) => {
      const response = await fetch(`${url}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, mimeType: 'image/jpeg' }),
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.items[0].nutritionBasis, 'reference');
      assert.match(data.items[0].referenceDescription, /quinoa/i);
      assert.equal(data.grounding.matched, 1);
      const request = fake.calls.perception[0].body;
      assert.equal(request.store, false);
      assert.equal(request.input[1].data, image);
      assert.equal(request.generation_config.thinking_level, 'low');
      assert.equal(fake.calls.match[0].body.store, false);
    },
  );
});
test('descriptions are analyzed without a photo', async () => {
  const fake = fakeProvider({ perceive: () => perception([quinoa]) });
  await withServer(
    { apiKey: 'test', provider: 'openrouter', fetchImpl: fake.fetchImpl },
    async (url) => {
      const response = await fetch(`${url}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'half a cup of quinoa' }),
      });
      assert.equal(response.status, 200);
      assert.equal(fake.calls.perception[0].body.messages[1].content.length, 1);
      const bad = await fetch(`${url}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '' }),
      });
      assert.equal(bad.status, 400);
    },
  );
});
test('food search and lookup answer from the bundled USDA database without an AI key', async () => {
  await withServer({ apiKey: '' }, async (url) => {
    const health = await (await fetch(`${url}/health`)).json();
    assert.ok(health.foods > 10000);
    const search = await (await fetch(`${url}/foods/search?q=banana`)).json();
    assert.match(search.foods[0].description, /banana/i);
    assert.deepEqual(search.branded, []);
    const food = await (await fetch(`${url}/foods/${search.foods[0].id}`)).json();
    assert.equal(food.id, search.foods[0].id);
    assert.equal((await fetch(`${url}/foods/1`)).status, 404);
    assert.equal((await fetch(`${url}/foods/search?q=`)).status, 400);
  });
});
test('barcodes are looked up server-side and missing products say what to do next', async () => {
  clearSourceCache();
  const fetchImpl = async (target) =>
    String(target).includes('3017624010701')
      ? Response.json({
          status: 1,
          product: {
            product_name: 'Spread',
            nutriments: { carbohydrates_100g: 57.5, 'energy-kcal_100g': 539 },
          },
        })
      : Response.json({ status: 0 });
  await withServer({ apiKey: '', fetchImpl }, async (url) => {
    const found = await fetch(`${url}/barcode/3017624010701`);
    assert.equal(found.status, 200);
    assert.equal((await found.json()).per100g.carbs, 57.5);
    const missing = await fetch(`${url}/barcode/0000000000000`);
    assert.equal(missing.status, 404);
    assert.match((await missing.json()).error, /nutrition label/);
    assert.equal((await fetch(`${url}/barcode/abc`)).status, 404);
  });
});
test('a stalled provider returns a timeout response with a manual fallback', async () => {
  await withServer(
    { apiKey: 'test', timeoutMs: 20, fetchImpl: () => new Promise(() => {}) },
    async (url) => {
      const response = await fetch(`${url}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, mimeType: 'image/jpeg' }),
      });
      assert.equal(response.status, 504);
      assert.match((await response.json()).error, /took too long.*review manually/);
    },
  );
});

test('disconnecting from the scan cancels the provider request', async () => {
  let started;
  const ready = new Promise((resolve) => {
    started = resolve;
  });
  await withServer(
    {
      apiKey: 'test',
      fetchImpl: async (_, { signal }) => {
        started(signal);
        return new Promise(() => {});
      },
    },
    async (url) => {
      const controller = new AbortController();
      const request = fetch(`${url}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, mimeType: 'image/jpeg' }),
        signal: controller.signal,
      });
      const upstreamSignal = await ready;
      const cancelled = new Promise((resolve) =>
        upstreamSignal.addEventListener('abort', resolve, { once: true }),
      );
      controller.abort();
      await assert.rejects(request, { name: 'AbortError' });
      await cancelled;
      assert.equal(upstreamSignal.aborted, true);
    },
  );
});
test('invalid model results and non-food responses are rejected', () => {
  for (const carbs of [-5, Infinity, '20', 2001])
    assert.throws(() => validatePerception({ ...result, items: [{ ...result.items[0], carbs }] }));
  for (const calories of [undefined, null, -1, Infinity, '111', 20001])
    assert.throws(() =>
      validatePerception({ ...result, items: [{ ...result.items[0], calories }] }),
    );
  assert.throws(() => validatePerception({ ...result, items: [] }), { status: 422 });
  assert.throws(() => validatePerception({ ...result, uncertainty: '' }));
  assert.throws(() =>
    validateImage({
      mimeType: 'image/jpeg',
      image: Buffer.from('not an image').toString('base64'),
    }),
  );
});
test('origin restrictions, invalid JSON, and upstream errors are surfaced safely', async () => {
  await withServer(
    {
      apiKey: 'test',
      fetchImpl: async () => new Response('private provider details', { status: 500 }),
    },
    async (url) => {
      assert.equal(
        (await fetch(`${url}/health`, { headers: { Origin: 'https://untrusted.example' } })).status,
        403,
      );
      assert.equal(
        (
          await fetch(`${url}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{',
          })
        ).status,
        400,
      );
      const response = await fetch(`${url}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, mimeType: 'image/jpeg' }),
      });
      assert.equal(response.status, 502);
      assert.ok(!(await response.text()).includes('private provider details'));
    },
  );
});

test('global scan concurrency is bounded and released after cancellation', async () => {
  let started = 0;
  let ready;
  const bothStarted = new Promise((resolve) => {
    ready = resolve;
  });
  await withServer(
    {
      apiKey: 'test',
      fetchImpl: async () => {
        if (++started === 2) ready();
        return new Promise(() => {});
      },
    },
    async (url) => {
      const controllers = [new AbortController(), new AbortController()];
      const init = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, mimeType: 'image/jpeg' }),
      };
      const pending = controllers.map((c) =>
        fetch(`${url}/analyze`, { ...init, signal: c.signal }).catch(() => {}),
      );
      await bothStarted;
      try {
        const response = await fetch(`${url}/analyze`, init);
        assert.equal(response.status, 429);
        assert.equal(response.headers.get('Retry-After'), '5');
        assert.equal(started, 2);
      } finally {
        controllers.forEach((c) => c.abort());
        await Promise.all(pending);
      }
      // Observe cancellation reaching the server before checking that a slot is reusable.
      for (let i = 0; i < 20; i++) {
        const response = await fetch(`${url}/analyze`, { ...init, body: '{' });
        if (response.status === 400) return;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      assert.fail('Cancelled uploads did not release their scan slots');
    },
  );
});

test('unfinished uploads time out without calling the provider and release capacity', async () => {
  let calls = 0;
  await withServer(
    {
      apiKey: 'test',
      uploadTimeoutMs: 25,
      fetchImpl: async () => {
        calls++;
      },
    },
    async (url) => {
      const status = await new Promise((resolve, reject) => {
        const req = httpRequest(
          `${url}/analyze`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          },
          (res) => {
            res.resume();
            res.on('end', () => {
              resolve(res.statusCode);
              req.destroy();
            });
          },
        );
        req.on('error', reject);
        req.write('{');
      });
      assert.equal(status, 408);
      assert.equal(calls, 0);
      const response = await fetch(`${url}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      });
      assert.equal(response.status, 400);
    },
  );
});
