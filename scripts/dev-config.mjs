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
    if (/^(OPENROUTER_|GEMINI_|INFISICAL_)/.test(key) || key === 'AI_PROVIDER') delete result[key];
  }
  return result;
}
