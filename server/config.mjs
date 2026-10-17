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
    // Text-only USDA matching can use a cheaper model; defaults to the vision model.
    matchModel:
      (provider === 'openrouter' ? env.OPENROUTER_MATCH_MODEL : env.GEMINI_MATCH_MODEL) ||
      undefined,
    // Optional: enables USDA Branded Foods barcode/label lookups. https://fdc.nal.usda.gov/api-key-signup
    usdaKey: env.USDA_API_KEY?.trim() || undefined,
  };
}
