export function analysisConfig(env = process.env) {
  const provider = env.AI_PROVIDER || (env.OPENROUTER_API_KEY ? 'openrouter' : 'gemini');
  if (!['openrouter', 'gemini'].includes(provider))
    throw new Error('AI_PROVIDER must be openrouter or gemini.');
  return {
    provider,
    apiKey: (provider === 'openrouter' ? env.OPENROUTER_API_KEY : env.GEMINI_API_KEY)?.trim(),
    model:
      provider === 'openrouter'
        ? env.OPENROUTER_MODEL || 'google/gemini-2.5-flash'
        : env.GEMINI_MODEL || 'gemini-3.8-flash',
  };
}
