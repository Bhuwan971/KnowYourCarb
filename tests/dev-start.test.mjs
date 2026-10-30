import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertPortAvailable } from '../scripts/dev-config.mjs';

async function occupyPort(task) {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '0.0.0.0', resolve));
  try {
    await task(server.address().port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}
async function runScript(script, args, port) {
  const child = spawn(
    process.execPath,
    [fileURLToPath(new URL(script, import.meta.url)), ...args],
    {
      env: { ...process.env, PORT: String(port), SERVICE_HOST: '0.0.0.0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk;
  });
  child.stderr.on('data', (chunk) => {
    output += chunk;
  });
  const timer = setTimeout(() => child.kill('SIGTERM'), 5000);
  try {
    const code = await new Promise((resolve, reject) => {
      child.once('exit', resolve);
      child.once('error', reject);
    });
    return { code, output };
  } finally {
    clearTimeout(timer);
  }
}
test('port checks distinguish conflicts from invalid configuration and release their probe', async () => {
  await occupyPort(async (port) => {
    await assert.rejects(assertPortAvailable(port, 'Photo service'), /already in use/);
  });
  for (const port of [NaN, 0, 65536, 8081.5])
    await assert.rejects(assertPortAvailable(port, 'Expo'), /between 1 and 65535/);
  let freePort;
  await occupyPort(async (port) => {
    freePort = port;
  });
  await assertPortAvailable(freePort, 'Photo service');
  await assertPortAvailable(freePort, 'Photo service');
});
test('service conflict exits before Infisical or Expo starts, without blaming credentials', async () => {
  await occupyPort(async (port) => {
    const result = await runScript('../scripts/start-dev.mjs', ['--infisical'], port);
    assert.equal(result.code, 1);
    assert.match(result.output, new RegExp(`Photo service port ${port} is already in use`));
    assert.doesNotMatch(
      result.output,
      /Injecting|Starting project|login|secret path|Unhandled 'error'/,
    );
  });
});
test('Expo conflict exits before starting the photo service', async () => {
  let servicePort;
  await occupyPort(async (port) => {
    servicePort = port;
  });
  await occupyPort(async (expoPort) => {
    const result = await runScript(
      '../scripts/start-dev.mjs',
      ['--infisical', '--port', String(expoPort)],
      servicePort,
    );
    assert.equal(result.code, 1);
    assert.match(result.output, new RegExp(`Expo port ${expoPort} is already in use`));
    assert.doesNotMatch(result.output, /Injecting|Starting project|login/);
    await assertPortAvailable(servicePort, 'Photo service');
  });
});
test('direct service startup handles a bind conflict without an unhandled stack trace', async () => {
  await occupyPort(async (port) => {
    const result = await runScript('../server/index.mjs', [], port);
    assert.equal(result.code, 1);
    assert.match(result.output, /Photo service port .* already in use/);
    assert.doesNotMatch(result.output, /Unhandled 'error'|node:events|at Server/);
  });
});

test('local service defaults to loopback and refuses production mode', async () => {
  const { serviceRuntime } = await import('../server/runtime.mjs');
  assert.deepEqual(serviceRuntime({}), { host: '127.0.0.1', port: 3001 });
  assert.equal(serviceRuntime({ SERVICE_HOST: '0.0.0.0' }).host, '0.0.0.0');
  assert.throws(() => serviceRuntime({ NODE_ENV: 'production' }), /Public hosting is not enabled/);
  for (const PORT of ['0', '65536', 'wat', '3.5'])
    assert.throws(() => serviceRuntime({ PORT }), /PORT must/);
  assert.throws(() => serviceRuntime({ SERVICE_HOST: 'example.com' }), /SERVICE_HOST/);
});
