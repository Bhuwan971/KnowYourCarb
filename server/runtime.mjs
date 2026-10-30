// This service is intentionally local until anonymous abuse controls are implemented.
export function serviceRuntime(env = process.env) {
  if (env.NODE_ENV === 'production')
    throw new Error('Public hosting is not enabled. This service is for local use only.');
  const host = env.SERVICE_HOST || '127.0.0.1';
  if (!['127.0.0.1', '::1', '0.0.0.0'].includes(host))
    throw new Error('SERVICE_HOST must be 127.0.0.1, ::1, or 0.0.0.0.');
  const port = Number(env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('PORT must be an integer between 1 and 65535.');
  return { host, port };
}
