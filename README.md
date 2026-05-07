# Couchy

> Curated discovery for **Steam couch co-op & same-screen multiplayer games**.

Couchy is the page you visit when friends are over and someone asks "what should we play?".
Pick a vibe, browse a handful of curated rails, click through to Steam.

See [`GOALS.md`](./GOALS.md) for the full design and product brief.

## Stack

- **TanStack Start** (full-stack React, SSR, server functions, file-based routing)
- **React 19** + **Material UI v9** + **Emotion**
- **TypeScript** (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- **ESLint 9** flat config with `typescript-eslint` *strict-type-checked* + *stylistic*
- **pnpm**

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

Other scripts:

```bash
pnpm typecheck    # tsc --noEmit, must be 0 errors
pnpm lint         # eslint, must be 0 warnings
pnpm build
pnpm start        # serve the production build
```

## Environment

Copy `.env.example` → `.env` if you want to override defaults. **No keys are required**
to run the site — the two Steam storefront endpoints Couchy depends on (`/search/results`
and `/api/appdetails`) are public.

```env
STEAM_API_KEY=          # only needed for future api.steampowered.com calls
STEAM_CC=us             # country code for prices
STEAM_LOCALE=english    # store text locale
```

## How it works

- All Steam calls are server-side via TanStack Start `createServerFn` (Steam blocks CORS).
- `src/server/steam/client.ts` calls `store.steampowered.com/search/results/?infinite_scroll=1&category3=…`
  for couch-friendly category filters (`24` = Shared/Split Screen, `39` = Co-op,
  `37` = PvP), and `store.steampowered.com/api/appdetails/?appids=…` for the detail page.
- Responses are cached in-memory (`src/server/cache.ts`) — search results 30 min,
  app details 24 h — to stay well below Steam's 200 req / 5 min limit.
- The HTML fragment Steam returns is parsed with **cheerio**
  (`src/server/steam/parseSearchHtml.ts`) into a small `SteamGameSummary` shape.

## Routes

| Path              | What it is |
|-------------------|------------|
| `/`               | Discovery page: hero, mood quiz, 5 curated rails. |
| `/browse`         | Filterable catalog (mood, sort, on-sale toggle). |
| `/game/$appid`    | Detail page (screenshots, price, "Open on Steam" CTA). |
| `/about`          | Data attribution and project blurb. |

## Deploying

### Why not GitHub Pages

Couchy can't run as static-only. Every Steam call goes through a server function
because Steam blocks CORS on `store.steampowered.com/search/results` and
`/api/appdetails`. The in-memory cache that keeps us under Steam's
200 req / 5 min rate limit also has to live server-side. Pure static hosting
would just produce a wall of network errors.

### Coolify (or any Docker host)

The repo ships a multi-stage `Dockerfile`. Build and run it like any Node app:

```bash
docker build -t couchy .
docker run --rm -p 3000:3000 -e STEAM_CC=us -e STEAM_LOCALE=english couchy
# → http://localhost:3000
```

In Coolify:

1. New resource → **Dockerfile** application, point at this repo.
2. Set the exposed port to **3000** (the container reads `PORT` from env if you
   want to change it).
3. Optional environment variables:
   - `STEAM_CC` (default `us`) — country code for prices.
   - `STEAM_LOCALE` (default `english`) — store text locale.
   - `STEAM_API_KEY` — currently unused; reserved for future official API calls.
4. Deploy. The container builds with `pnpm build`, then boots
   `node server-entry.mjs` on `0.0.0.0:$PORT`.

The server entry (`server-entry.mjs`) is a 50-line Node http adapter that
wraps the Web-standard fetch handler TanStack Start emits. Memory footprint at
idle is ~120 MB; the Steam response cache is in-process so a restart cold-starts
the cache. No external dependencies (no Redis, no DB).

## Disclaimer

Fan project. Not affiliated with Valve. Game artwork and metadata © respective publishers.
