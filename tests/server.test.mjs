import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/index.mjs';
import { validateAnalysis, validateImage } from '../server/analysis.mjs';
const result = {
  title: 'Quinoa bowl',
  items: [{ name: 'Quinoa', portion: '½ cup', carbs: 20, calories: 111 }],
  uncertainty: 'The portion is approximate; sauce and hidden ingredients may change the carbs.',
};
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
test('server proxies the image, disables interaction storage and returns validated estimates', async () => {
  let request;
  await withServer(
    {
      apiKey: 'test-key',
      fetchImpl: async (_, options) => {
        request = JSON.parse(options.body);
        return Response.json({
          status: 'completed',
          steps: [
            { type: 'model_output', content: [{ type: 'text', text: JSON.stringify(result) }] },
          ],
        });
      },
    },
    async (url) => {
      const response = await fetch(`${url}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, mimeType: 'image/jpeg' }),
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), result);
      assert.equal(request.store, false);
      assert.equal(request.input[1].data, image);
    },
  );
});
test('invalid model results and non-food responses are rejected', () => {
  for (const carbs of [-5, Infinity, '20', 2001])
    assert.throws(() => validateAnalysis({ ...result, items: [{ ...result.items[0], carbs }] }));
  for (const calories of [undefined, null, -1, Infinity, '111', 20001])
    assert.throws(() => validateAnalysis({ ...result, items: [{ ...result.items[0], calories }] }));
  assert.throws(() => validateAnalysis({ ...result, items: [] }), { status: 422 });
  assert.throws(() => validateAnalysis({ ...result, uncertainty: '' }));
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
