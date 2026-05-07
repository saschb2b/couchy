# Couchy

> The site to visit when friends are over and someone asks "what should we play?"

Couchy is a hand-tuned discovery page for **same-screen multiplayer games on
Steam**. The use case is narrow on purpose: a group of friends in a living
room with one TV and 1–4 controllers, picking something to play in the next
ten minutes. No online-only games leaking in, no doomscrolling Steam, no
chatbot-flavoured marketing copy.

## What you get

- **Five distinct mood rails on the homepage.** *Loud & silly*, *Plan &
  betray*, *Co-op story*, *Versus*, plus an *Everything* umbrella. Each rail
  is backed by a real Steam category + community-tag combination, so the
  games you see actually match the label.
- **Player-count filter.** Tell it how many controllers you have and it
  hides anything with a confirmed lower ceiling.
- **Editor's picks for the games Steam mistags.** Nidhogg 2, Magicka, the
  Worms series, Speedrunners. All couch staples that lack the right
  category flag and would be invisible without a manual pin.
- **Filterable catalog at `/browse`** with mood, sort (top sellers / new
  releases / all-time hits), and an on-sale toggle.
- **Per-game detail pages** with a screenshot lightbox, hover trailer,
  review summary, and a shortlist for "we'll come back to this one".
- **No middleman.** Every card links straight to the Steam store page.

## How it works under the hood

There's no clean public Steam API for "couch games", so Couchy stitches
together two storefront endpoints behind a server-side cache.

### Data flow

```
browser ──► /server-fn ──► store.steampowered.com/search/results
                       └─► store.steampowered.com/api/appdetails
```

The browser only ever talks to our server. Server functions fetch Steam,
parse, cache, and return shaped data. Steam blocks CORS on the storefront,
which is why a static-only build of this site is impossible.

### Steam category landmines

The umbrella filter is `category3=24` (Shared/Split Screen). Empirically
verified across ~30 canonical couch titles, this catches the strong majority
correctly and excludes online-only games (Helldivers 2, Among Us, Lethal
Company) cleanly. A handful of well-known couch games are missing this
category because their developers didn't tag it. Those are surfaced via
the editor's picks list at `src/server/steam/editorsPicks.ts`.

Category id `40` is **not** Shared/Split Screen PvP. It's "SteamVR
Collectibles". Getting that wrong leaks single-player VR titles like
Superhot VR into the couch versus rail. The verified ids live in
`src/server/steam/categories.ts`.

### Mood → Steam query

| Mood          | Steam query                       | Why                               |
|---------------|-----------------------------------|-----------------------------------|
| Everything    | cat 24                            | umbrella                          |
| Loud & silly  | cat 24 + tag 7178 (Party Game)    | drops Cuphead, keeps Jackbox      |
| Plan & betray | cat 39 + tag 9 (Strategy)         | For The King II, Cult of the Lamb |
| Co-op story   | cat 39 + tag 1742 (Story Rich)    | It Takes Two, Split Fiction       |
| Versus        | cat 37                            | already narrow without tags       |

Tag ids resolved via `store.steampowered.com/tagdata/populartags/english`
and verified against reference titles per bucket.

### Cache and rate limit

Steam allows roughly 200 requests every 5 minutes. The in-memory cache in
`src/server/cache.ts` keeps search responses for 30 minutes and `appdetails`
responses for 24 hours, so a popular page hits Steam roughly once per cache
window. No Redis, no database. A restart cold-starts the cache.

### Parsing the search HTML

`store.steampowered.com/search/results/?infinite_scroll=1` returns one of
two shapes depending on caller IP: raw HTML on residential IPs, or a
`{ results_html, total_count }` JSON envelope on datacenter IPs.
`src/server/steam/client.ts` handles both. The non-game denylist
(subscriptions, "Friend's Pass", soundtracks, demos) lives in
`src/server/steam/parseSearchHtml.ts`.

## Tech stack

- TanStack Start (full-stack React, SSR, server functions, file-based routing)
- React 19, MUI v9, Emotion
- TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- ESLint 9 flat config, `typescript-eslint` strict-type-checked + stylistic
- pnpm
- cheerio for the search-HTML parser

## Getting started

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

### Environment

Copy `.env.example` to `.env` if you want to override defaults. **No API
keys are required to run Couchy.** The two storefront endpoints it depends
on are public.

```env
STEAM_API_KEY=          # only needed for future api.steampowered.com calls
STEAM_CC=us             # country code for prices
STEAM_LOCALE=english    # store text locale
```

### Routes

| Path            | What it is                                           |
|-----------------|------------------------------------------------------|
| `/`             | Discovery page: hero, mood grid, curated rails.      |
| `/browse`       | Filterable catalog (mood, sort, on-sale toggle).     |
| `/game/$appid`  | Detail page (screenshots, trailer, "Open on Steam"). |
| `/shortlist`    | Saved games (localStorage).                          |
| `/about`        | Data attribution and project blurb.                  |

### House style

`CLAUDE.md` is the authoritative guide for voice, visual, and engineering
style. It also enumerates the AI-tells we deliberately don't ship: em
dashes in prose, "opinionated", arbitrary numbering, default MUI chips, and
a few others. Read it before opening a PR that changes copy, the layout,
or the Steam data flow.

## Deploying

### Why not GitHub Pages

Couchy can't run as static-only. Steam blocks CORS on the storefront
endpoints, and the in-memory cache that keeps us under the rate limit also
has to live server-side. Pure static hosting would just produce a wall of
network errors.

### Coolify (or any Docker host)

The repo ships a multi-stage `Dockerfile`. Build and run it like any Node
app:

```bash
docker build -t couchy .
docker run --rm -p 3000:3000 -e STEAM_CC=us -e STEAM_LOCALE=english couchy
# → http://localhost:3000
```

In Coolify:

1. New resource → **Dockerfile** application, point at this repo.
2. Set the exposed port to **3000** (override with the `PORT` env if needed).
3. Optional env vars: `STEAM_CC`, `STEAM_LOCALE`, `STEAM_API_KEY`.
4. Deploy. The container builds with `pnpm build`, then boots
   `node server-entry.mjs` on `0.0.0.0:$PORT`.

`server-entry.mjs` is a thin Node http adapter that wraps the Web-standard
fetch handler TanStack Start emits. Idle memory is around 120 MB. The Steam
response cache is in-process, so a restart cold-starts it. No external
dependencies. No Redis, no database.

## Disclaimer

Fan project. Not affiliated with Valve. Game artwork and metadata
© respective publishers.
