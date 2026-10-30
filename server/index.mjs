import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { estimate, validateInput } from './analysis.mjs';
import { serviceRuntime } from './runtime.mjs';
import { analysisConfig } from './config.mjs';
import { foodCount, getFood, searchFoods } from './foods.mjs';
import { lookupBarcode, searchBranded } from './sources.mjs';
const MAX_BODY = 6_100_000;
function readJson(req, uploadTimeoutMs) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    let failed = false;
    const timer = setTimeout(() => {
      failed = true;
      chunks.length = 0;
      reject(Object.assign(new Error('Upload took too long. Please try again.'), { status: 408 }));
    }, uploadTimeoutMs);
    timer.unref();
    const clear = () => clearTimeout(timer);
    req.once('end', clear);
    req.once('error', clear);
    req.once('aborted', clear);
    req.on('data', (chunk) => {
      if (failed) return;
      size += chunk.length;
      if (size > MAX_BODY) {
        failed = true;
        clear();
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
  matchModel = analysisConfig().matchModel,
  usdaKey = analysisConfig().usdaKey,
  origins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8081,http://127.0.0.1:8081').split(
    ',',
  ),
  fetchImpl = fetch,
  now = Date.now,
  timeoutMs,
  uploadTimeoutMs = 15_000,
} = {}) {
  serviceRuntime();
  const limits = new Map();
  let activeScans = 0;
  const server = createServer(async (req, res) => {
    const send = (status, data) => {
      if (res.writableEnded || res.destroyed) return;
      if (status === 408 || status === 413) {
        res.setHeader('Connection', 'close');
        res.once('finish', () => req.destroy());
      }
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
    let url;
    try {
      url = new URL(req.url, 'http://localhost');
    } catch {
      return send(400, { error: 'Invalid request URL.' });
    }
    if (url.pathname === '/health' && req.method === 'GET') {
      send(200, {
        ok: true,
        configured: Boolean(apiKey),
        provider,
        foods: foodCount(),
        branded: Boolean(usdaKey),
      });
      return;
    }
    const limited = (bucket, max) => {
      const key = `${bucket}:${req.socket.remoteAddress}`;
      const time = now();
      for (const [k, entry] of limits) if (entry.reset <= time) limits.delete(k);
      const limit = limits.get(key) || { count: 0, reset: time + 60_000 };
      limits.set(key, limit);
      return ++limit.count > max;
    };
    if (req.method === 'GET' && url.pathname === '/foods/search') {
      if (limited('search', 120))
        return send(429, { error: 'Searching a little fast. Wait a moment.' });
      const query = (url.searchParams.get('q') || '').trim().slice(0, 100);
      if (!query) return send(400, { error: 'Type a food to search.' });
      const foods = searchFoods(query, { limit: 12 });
      let branded = [];
      try {
        branded = await searchBranded(query, {
          fetchImpl,
          usdaKey,
          limit: 5,
          signal: AbortSignal.timeout(4000),
        });
      } catch {
        // Branded results are optional; the bundled USDA database still answers.
      }
      return send(200, { foods, branded });
    }
    const foodMatch = url.pathname.match(/^\/foods\/(\d{1,9})$/);
    if (req.method === 'GET' && foodMatch) {
      const food = getFood(Number(foodMatch[1]));
      return food ? send(200, food) : send(404, { error: 'That food isn’t in the database.' });
    }
    const barcodeMatch = url.pathname.match(/^\/barcode\/([0-9]{6,14})$/);
    if (req.method === 'GET' && barcodeMatch) {
      if (limited('barcode', 30))
        return send(429, { error: 'A few too many scans. Wait a minute.' });
      try {
        const product = await lookupBarcode(barcodeMatch[1], {
          fetchImpl,
          usdaKey,
          signal: AbortSignal.timeout(8000),
        });
        return product
          ? send(200, product)
          : send(404, {
              error: 'We couldn’t find that barcode yet. Snap the nutrition label instead.',
            });
      } catch (error) {
        return send(error.status || 502, {
          error: error.status ? error.message : 'The food databases couldn’t be reached.',
        });
      }
    }
    if (url.pathname !== '/analyze' || req.method !== 'POST') {
      send(404, { error: 'Not found.' });
      return;
    }
    if (limited('analyze', 10)) {
      send(429, { error: 'A few too many snaps at once. Please wait a minute.' });
      return;
    }
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
    // Bound total uploads and paid scans, including clients using different addresses.
    if (activeScans >= 2) {
      res.setHeader('Retry-After', '5');
      return send(429, { error: 'Two scans are already running. Please try again shortly.' });
    }
    activeScans++;
    const controller = new AbortController();
    const cancel = () => {
      if (!res.writableEnded) controller.abort();
    };
    res.on('close', cancel);
    try {
      const body = await readJson(req, uploadTimeoutMs);
      const input = validateInput(body);
      send(
        200,
        await estimate(input, {
          provider,
          apiKey,
          model,
          matchModel,
          fetchImpl,
          timeoutMs,
          signal: controller.signal,
        }),
      );
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
    } finally {
      activeScans--;
      res.off('close', cancel);
    }
  });
  server.requestTimeout = 90_000;
  server.headersTimeout = 15_000;
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let runtime;
  try {
    runtime = serviceRuntime();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
  const server = createApp();
  const { host, port } = runtime;
  server.once('error', (error) => {
    console.error(
      error.code === 'EADDRINUSE'
        ? `Photo service port ${port} is already in use. Stop the previous server, or set PORT to a free port.`
        : `The photo service could not listen on port ${port} (${error.code}).`,
    );
    process.exitCode = 1;
  });
  server.listen(port, host, () =>
    console.log(
      `Carbsy local photo service: http://localhost:${port}\nPhoto estimates: ${analysisConfig().apiKey ? `configured (${analysisConfig().provider})` : 'not configured (manual journal works)'}`,
    ),
  );
  const stop = () => {
    server.close();
    setTimeout(() => server.closeAllConnections(), 5000).unref();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
