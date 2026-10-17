import { createServer } from 'node:net';

export function infisicalArgs(env = process.env) {
  return [
    'run',
    '--silent',
    '--telemetry=false',
    '--expand=false',
    `--env=${env.INFISICAL_ENV || 'dev'}`,
    `--path=${env.INFISICAL_SECRET_PATH || '/'}`,
    ...(env.INFISICAL_PROJECT_ID ? [`--projectId=${env.INFISICAL_PROJECT_ID}`] : []),
    '--',
    process.execPath,
    'server/index.mjs',
  ];
}

export function expoEnvironment(env, analysisUrl) {
  const result = { ...env, EXPO_PUBLIC_ANALYSIS_URL: analysisUrl, EXPO_NO_DOTENV: '1' };
  // Infisical injection runs in the service child only. Also strip local provider and auth keys.
  for (const key of Object.keys(result)) {
    if (/^(OPENROUTER_|GEMINI_|INFISICAL_|USDA_)/.test(key) || key === 'AI_PROVIDER')
      delete result[key];
  }
  return result;
}

// Check before starting either child, so a conflict cannot leave a partial dev session.
export async function assertPortAvailable(port, label) {
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error(`${label} port must be a number between 1 and 65535.`);
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', (error) =>
      reject(
        new Error(
          error.code === 'EADDRINUSE'
            ? `${label} port ${port} is already in use. Stop the previous dev server, or choose ${label === 'Photo service' ? 'another service port with PORT=3002 npm run start:infisical' : 'another Expo port with npm run start:infisical -- --port 8083'}.`
            : `${label} cannot use port ${port} (${error.code}).`,
        ),
      ),
    );
    probe.listen({ port, host: '0.0.0.0', exclusive: true }, () =>
      probe.close((error) => (error ? reject(error) : resolve())),
    );
  });
}
