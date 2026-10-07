import test from 'node:test';
import assert from 'node:assert/strict';
import { estimate } from '../server/analysis.mjs';
import { analysisConfig } from '../server/config.mjs';
import { infisicalArgs, expoEnvironment } from '../scripts/dev-config.mjs';
const meal = {
  title: 'Rice bowl',
  items: [{ name: 'Rice', portion: '1 cup', carbs: 45, calories: 205 }],
  uncertainty: 'Portion and sauces are approximate.',
};
const completion = (content, finish_reason = 'stop') =>
  Response.json({
    choices: [{ finish_reason, message: { content } }],
  });

test('OpenRouter sends a vision request with a strict schema and validates calorie results', async () => {
  let sent;
  const result = await estimate('photo-base64', {
    provider: 'openrouter',
    apiKey: 'test-server-key',
    model: 'vision-model',
    fetchImpl: async (url, options) => {
      sent = { url, ...options, body: JSON.parse(options.body) };
      return completion(JSON.stringify(meal));
    },
  });
  assert.deepEqual(result, meal);
  assert.equal(sent.url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(sent.headers.Authorization, 'Bearer test-server-key');
  assert.equal(sent.body.model, 'vision-model');
  assert.equal(
    sent.body.messages[1].content[1].image_url.url,
    'data:image/jpeg;base64,photo-base64',
  );
  assert.equal(sent.body.response_format.json_schema.strict, true);
  assert.equal(sent.body.response_format.json_schema.schema.additionalProperties, false);
  assert.equal(sent.body.provider.require_parameters, true);
  assert.equal(sent.body.provider.data_collection, 'deny');
});

test('OpenRouter rejects truncated, refused, malformed and incomplete nutrition results', async () => {
  const responses = [
    () => completion(JSON.stringify(meal), 'length'),
    () => completion(null, 'content_filter'),
    () => completion('not JSON'),
    () => completion(JSON.stringify({ ...meal, items: [] })),
    () =>
      completion(
        JSON.stringify({ ...meal, items: [{ name: 'Rice', portion: '1 cup', carbs: 45 }] }),
      ),
    () => Response.json({ error: { message: 'private provider details' } }),
  ];
  for (const response of responses) {
    await assert.rejects(
      estimate('image', {
        provider: 'openrouter',
        apiKey: 'test',
        model: 'vision-model',
        fetchImpl: async () => response(),
      }),
    );
  }
});

test('OpenRouter errors explain key, credit and rate-limit failures without exposing provider bodies', async () => {
  for (const [status, message] of [
    [401, /key wasn’t accepted/],
    [402, /credits/],
    [429, /busy/],
    [500, /couldn’t complete/],
  ]) {
    await assert.rejects(
      estimate('image', {
        provider: 'openrouter',
        apiKey: 'test',
        model: 'vision-model',
        fetchImpl: async () => new Response('private upstream body', { status }),
      }),
      (error) => {
        assert.match(error.message, message);
        assert.ok(!error.message.includes('private upstream'));
        assert.equal(error.status, status === 429 ? 429 : 502);
        return true;
      },
    );
  }
});

test('provider selection respects explicit choice and never borrows another provider’s key', () => {
  assert.equal(analysisConfig({ OPENROUTER_API_KEY: 'router-key' }).provider, 'openrouter');
  assert.equal(
    analysisConfig({ AI_PROVIDER: 'openrouter', GEMINI_API_KEY: 'google-key' }).apiKey,
    undefined,
  );
  assert.equal(
    analysisConfig({
      AI_PROVIDER: 'gemini',
      OPENROUTER_API_KEY: 'router-key',
      GEMINI_API_KEY: 'google-key',
    }).apiKey,
    'google-key',
  );
  assert.throws(() => analysisConfig({ AI_PROVIDER: 'invalid' }));
});

test('Infisical targets only the service and Expo receives no provider keys or Infisical credentials', () => {
  const env = {
    PATH: '/bin',
    OPENROUTER_API_KEY: 'router-secret',
    GEMINI_API_KEY: 'google-secret',
    INFISICAL_TOKEN: 'vault-secret',
    INFISICAL_CLIENT_SECRET: 'machine-secret',
    INFISICAL_PROJECT_ID: 'project-id',
    INFISICAL_ENV: 'staging',
    INFISICAL_SECRET_PATH: '/food service',
    AI_PROVIDER: 'openrouter',
    EXPO_PUBLIC_FEATURE: 'visible',
  };
  const args = infisicalArgs(env);
  assert.ok(args.includes('--env=staging'));
  assert.ok(args.includes('--path=/food service'));
  assert.ok(args.includes('--projectId=project-id'));
  assert.equal(args.at(-1), 'server/index.mjs');
  assert.ok(!args.join(' ').includes('secret'));
  const publicEnv = expoEnvironment(env, 'http://192.168.1.10:3001');
  for (const key of Object.keys(publicEnv))
    assert.ok(!/^(OPENROUTER_|GEMINI_|INFISICAL_|AI_PROVIDER$)/.test(key));
  assert.equal(publicEnv.EXPO_PUBLIC_ANALYSIS_URL, 'http://192.168.1.10:3001');
  assert.equal(publicEnv.EXPO_PUBLIC_FEATURE, 'visible');
  assert.equal(publicEnv.EXPO_NO_DOTENV, '1');
  assert.equal(env.OPENROUTER_API_KEY, 'router-secret');
});

test('the dev launcher confines secrets fetched by Infisical to the photo service child', async () => {
  const { mkdtemp, mkdir, writeFile, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { spawn } = await import('node:child_process');
  const root = await mkdtemp(join(tmpdir(), 'carbsy-infisical-test-'));
  try {
    await mkdir(join(root, 'bin'));
    await mkdir(join(root, 'server'));
    await mkdir(join(root, 'node_modules/expo/bin'), { recursive: true });
    await writeFile(
      join(root, 'bin/infisical'),
      `#!/usr/bin/env node
const { spawn } = require('node:child_process');
const args = process.argv.slice(2);
const child = spawn(args[args.indexOf('--') + 1], args.slice(args.indexOf('--') + 2), {
  stdio: 'inherit', env: { ...process.env, OPENROUTER_API_KEY: 'dummy-vault-key', OTHER_VAULT_SECRET: 'dummy-other-value' }
});
process.on('SIGTERM', () => child.kill('SIGTERM'));
child.on('exit', code => process.exit(code || 0));
`,
      { mode: 0o755 },
    );
    await writeFile(
      join(root, 'server/index.mjs'),
      `
import { writeFileSync } from 'node:fs';
writeFileSync('service-result.json', JSON.stringify({
  providerKey: process.env.OPENROUTER_API_KEY === 'dummy-vault-key',
  otherSecret: process.env.OTHER_VAULT_SECRET === 'dummy-other-value'
}));
setTimeout(() => {}, 700);
`,
    );
    await writeFile(
      join(root, 'node_modules/expo/bin/cli'),
      `
const { writeFileSync } = require('node:fs');
writeFileSync('expo-result.json', JSON.stringify({
  providerKey: Boolean(process.env.OPENROUTER_API_KEY),
  otherSecret: Boolean(process.env.OTHER_VAULT_SECRET),
  dotenvDisabled: process.env.EXPO_NO_DOTENV === '1',
  analysisUrl: process.env.EXPO_PUBLIC_ANALYSIS_URL
}));
setInterval(() => {}, 1000);
`,
    );
    const launcher = fileURLToPath(new URL('../scripts/start-dev.mjs', import.meta.url));
    const child = spawn(process.execPath, [launcher, '--infisical'], {
      cwd: root,
      env: {
        ...process.env,
        PATH: `${join(root, 'bin')}:${process.env.PATH}`,
        EXPO_PUBLIC_ANALYSIS_URL: 'http://localhost:3001',
      },
      stdio: 'pipe',
    });
    child.stdout.resume();
    child.stderr.resume();
    const deadline = setTimeout(() => child.kill('SIGTERM'), 5000);
    try {
      const code = await new Promise((resolve, reject) => {
        child.once('exit', resolve);
        child.once('error', reject);
      });
      assert.equal(code, 0);
    } finally {
      clearTimeout(deadline);
    }
    assert.deepEqual(JSON.parse(await readFile(join(root, 'service-result.json'), 'utf8')), {
      providerKey: true,
      otherSecret: true,
    });
    assert.deepEqual(JSON.parse(await readFile(join(root, 'expo-result.json'), 'utf8')), {
      providerKey: false,
      otherSecret: false,
      dotenvDisabled: true,
      analysisUrl: 'http://localhost:3001',
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
