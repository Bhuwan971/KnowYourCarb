import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { estimate, validateImage } from './analysis.mjs';
import { analysisConfig } from './config.mjs';
const MAX_BODY = 6_100_000;
function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    let failed = false;
    req.on('data', (chunk) => {
      if (failed) return;
      size += chunk.length;
      if (size > MAX_BODY) {
        failed = true;
        chunks.length = 0;
        reject(
          Object.assign(new Error('This photo is too large. Please use a smaller photo.'), {
            status: 413,
          }),
        );
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (failed) return;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('Invalid request.'), { status: 400 }));
      }
    });
    req.on('error', reject);
    req.on('aborted', () =>
      reject(Object.assign(new Error('Request cancelled.'), { status: 400 })),
    );
  });
}
export function createApp({
  provider = analysisConfig().provider,
  apiKey = analysisConfig().apiKey,
  model = analysisConfig().model,
  origins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8081,http://127.0.0.1:8081').split(
    ',',
  ),
  fetchImpl = fetch,
  now = Date.now,
} = {}) {
  const limits = new Map();
  const server = createServer(async (req, res) => {
    const send = (status, data) => {
      if (res.writableEnded || res.destroyed) return;
      res.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(JSON.stringify(data));
    };
    const origin = req.headers.origin;
    if (origin && !origins.includes(origin)) {
      send(403, { error: 'This origin isn’t allowed.' });
      return;
    }
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.url === '/health' && req.method === 'GET') {
      send(200, { ok: true, configured: Boolean(apiKey), provider });
      return;
    }
    if (req.url !== '/analyze' || req.method !== 'POST') {
      send(404, { error: 'Not found.' });
      return;
    }
    const address = req.socket.remoteAddress;
    const time = now();
    for (const [key, entry] of limits) if (entry.reset <= time) limits.delete(key);
    const limit = limits.get(address) || { count: 0, reset: time + 60_000 };
    if (++limit.count > 10) {
      send(429, { error: 'A few too many snaps at once. Please wait a minute.' });
      return;
    }
    limits.set(address, limit);
    if (!apiKey) {
      send(503, {
        error:
          'AI estimates aren’t connected yet. Once connected, a snap automatically fills in calories and carbs. You can enter them yourself for now.',
      });
      return;
    }
    if (!req.headers['content-type']?.startsWith('application/json')) {
      send(415, { error: 'Use a JSON photo request.' });
      return;
    }
    if (Number(req.headers['content-length']) > MAX_BODY) {
      send(413, { error: 'This photo is too large.' });
      req.resume();
      return;
    }
    try {
      const body = await readJson(req);
      const image = validateImage(body);
      send(200, await estimate(image, { provider, apiKey, model, fetchImpl }));
    } catch (error) {
      // Never log photographs, keys, or upstream response bodies.
      const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError';
      send(error.status || (timedOut ? 504 : 502), {
        error: timedOut
          ? 'That estimate took too long. Try again or review manually.'
          : error.status
            ? error.message
            : 'The photo service is unavailable. You can still save your snap manually.',
      });
    }
  });
  server.requestTimeout = 50_000;
  server.headersTimeout = 15_000;
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createApp();
  const port = Number(process.env.PORT || 3001);
  server.listen(port, '0.0.0.0', () =>
    console.log(
      `Carbsy local photo service: http://localhost:${port}\nPhoto estimates: ${analysisConfig().apiKey ? `configured (${analysisConfig().provider})` : 'not configured (manual journal works)'}`,
    ),
  );
}
