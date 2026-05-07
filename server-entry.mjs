/**
 * Tiny Node HTTP adapter for the TanStack Start build output.
 *
 * `pnpm build` produces `dist/server/server.js` as a Web-standard
 * `{ fetch(request) }` handler. TanStack Start doesn't ship a Node
 * listener out of the box (it targets fetch-runtimes like Bun, Deno,
 * and Workers). For Node we wrap the handler in `http.createServer`
 * here. PORT and HOST are read from env so Coolify / any orchestrator
 * can configure them.
 *
 * The fetch handler does SSR only — it does not serve the client
 * bundle in `dist/client/`. We serve those files directly here, ahead
 * of the handler, so `<script src="/assets/...">` resolves and the
 * page hydrates. Without this the client never boots and any
 * button-based navigation (filter sidebar, "show more", etc.) is dead.
 */

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { extname, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const host = process.env.HOST ?? '0.0.0.0';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CLIENT_DIR = resolve(__dirname, 'dist', 'client');

const MIME = {
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

async function tryServeStatic(req, res, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return false;
  }
  const relative = normalize(decoded).replace(/^([\\/])+/, '');
  const filePath = resolve(CLIENT_DIR, relative);
  if (filePath !== CLIENT_DIR && !filePath.startsWith(CLIENT_DIR + sep)) {
    return false;
  }
  let stats;
  try {
    stats = await stat(filePath);
  } catch {
    return false;
  }
  if (!stats.isFile()) return false;

  const ext = extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader('content-type', MIME[ext] ?? 'application/octet-stream');
  res.setHeader('content-length', stats.size);
  // Hash-named build outputs in /assets/ are immutable. Anything else
  // (favicon, robots.txt, etc.) gets a short revalidating cache.
  res.setHeader(
    'cache-control',
    pathname.startsWith('/assets/')
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=300, must-revalidate',
  );
  if (req.method === 'HEAD') {
    res.end();
    return true;
  }
  createReadStream(filePath).pipe(res);
  return true;
}

const handlerModule = await import('./dist/server/server.js');
const handler = handlerModule.default;

if (typeof handler?.fetch !== 'function') {
  console.error('dist/server/server.js does not export a { fetch } handler');
  process.exit(1);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `${host}:${port}`}`);

    if (req.method === 'GET' || req.method === 'HEAD') {
      if (await tryServeStatic(req, res, url.pathname)) return;
    }

    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
        for (const v of value) headers.append(name, v);
      } else if (value !== undefined) {
        headers.set(name, value);
      }
    }
    const init = { method: req.method, headers };
    if (req.method && !['GET', 'HEAD'].includes(req.method)) {
      init.body = Readable.toWeb(req);
      // Required by undici when streaming a request body.
      init.duplex = 'half';
    }
    const request = new Request(url, init);
    const response = await handler.fetch(request);

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    if (response.body) {
      Readable.fromWeb(response.body).pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('content-type', 'text/plain; charset=utf-8');
    }
    res.end('Internal server error');
  }
});

server.listen(port, host, () => {
  console.log(`Couchy listening on http://${host}:${port}`);
});

const shutdown = () => {
  console.log('Shutting down…');
  server.close(() => {
    process.exit(0);
  });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
