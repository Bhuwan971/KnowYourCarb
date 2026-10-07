import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import { infisicalArgs, expoEnvironment } from './dev-config.mjs';

// Start the photo service and Expo together, injecting Infisical secrets into the server only.
const port = Number(process.env.PORT || 3001);
const interfaces = networkInterfaces();
const entries = [
  ...(interfaces.en0 || []),
  ...Object.values(interfaces).flatMap((items) => items || []),
];
const host =
  entries.find((entry) => entry.family === 'IPv4' && !entry.internal)?.address || '127.0.0.1';
const incoming = process.argv.slice(2);
const useInfisical = incoming.includes('--infisical');
const serverOnly = incoming.includes('--server-only');
const args = incoming.filter((arg) => !['--infisical', '--server-only'].includes(arg));
const portFlag = args.indexOf('--port');
const expoPort = portFlag >= 0 ? args[portFlag + 1] : '8081';
const origins = [
  ...new Set([
    ...(process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
    `http://localhost:${expoPort}`,
    `http://127.0.0.1:${expoPort}`,
    `http://${host}:${expoPort}`,
  ]),
].join(',');
const analysisUrl = process.env.EXPO_PUBLIC_ANALYSIS_URL || `http://${host}:${port}`;
const server = spawn(
  useInfisical ? 'infisical' : process.execPath,
  useInfisical ? infisicalArgs() : ['server/index.mjs'],
  {
    stdio: 'inherit',
    env: { ...process.env, PORT: String(port), ALLOWED_ORIGINS: origins },
  },
);
const expo = serverOnly
  ? undefined
  : spawn(process.execPath, ['node_modules/expo/bin/cli', 'start', ...args], {
      stdio: 'inherit',
      env: expoEnvironment(process.env, analysisUrl),
    });
let stopping = false;
const stop = (code = 0) => {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  server.kill('SIGTERM');
  expo?.kill('SIGTERM');
};
process.once('SIGINT', () => stop());
process.once('SIGTERM', () => stop());
server.once('error', (error) => {
  console.error(
    useInfisical && error.code === 'ENOENT'
      ? 'Install the Infisical CLI, then run infisical login and infisical init in this project.'
      : 'The photo service could not start. Check the service and Infisical setup.',
  );
  stop(1);
});
server.once('exit', (code) => {
  if (!stopping && useInfisical && code)
    console.error(
      'Infisical could not start the photo service. Check login, project, environment and secret path.',
    );
  stop(code || 0);
});
expo?.once('error', () => {
  console.error('Expo could not start.');
  stop(1);
});
expo?.once('exit', (code) => stop(code || 0));
