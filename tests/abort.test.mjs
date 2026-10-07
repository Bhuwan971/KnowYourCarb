import test from 'node:test';
import assert from 'node:assert/strict';
import { withAbort } from '../src/lib/abort.ts';

test('a cancelled scan settles even when file preparation ignores abort', async () => {
  const controller = new AbortController();
  let rejectLate;
  const pending = withAbort(
    controller.signal,
    () =>
      new Promise((_, reject) => {
        rejectLate = reject;
      }),
  );
  controller.abort('timeout');
  await assert.rejects(pending, /cancelled/);
  // A later failure remains handled after the UI has returned to manual review.
  rejectLate(new Error('Late native file failure'));
});

test('an already cancelled scan never starts photo preparation', async () => {
  const controller = new AbortController();
  controller.abort('cancelled');
  let started = false;
  await assert.rejects(
    withAbort(controller.signal, async () => {
      started = true;
    }),
    /cancelled/,
  );
  assert.equal(started, false);
});

test('a completed scan returns its result and releases the abort listener', async () => {
  const controller = new AbortController();
  assert.equal(await withAbort(controller.signal, async () => 'estimate'), 'estimate');
  controller.abort();
});
