/**
 * Tiny Node HTTP adapter for the TanStack Start build output.
 *
 * `pnpm build` produces `dist/server/server.js` as a Web-standard
 * `{ fetch(request) }` handler. TanStack Start doesn't ship a Node
 * listener out of the box (it targets fetch-runtimes like Bun, Deno,
 * and Workers). For Node we wrap the handler in `http.createServer`
 * here. PORT and HOST are read from env so Coolify / any orchestrator
 * can configure them.
 */

import { createServer } from 'node:http';
import { Readable } from 'node:stream';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const host = process.env.HOST ?? '0.0.0.0';

const handlerModule = await import('./dist/server/server.js');
const handler = handlerModule.default;

if (typeof handler?.fetch !== 'function') {
  console.error('dist/server/server.js does not export a { fetch } handler');
  process.exit(1);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `${host}:${port}`}`);
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
