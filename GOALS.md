# Couchy — Goals & Plan

> **The site to visit when friends are over and someone asks "what should we play?"**

A curated discovery page for **couch / same-screen multiplayer games on Steam**.
Built so that in <30 seconds a user can either:

1. find a great new game to play tonight, or
2. browse a focused, well-organized catalog (instead of doomscrolling Steam + YouTube reviews).

Each game tile links out to its Steam store page so users can buy/install there.

---

## 1. Audience & key UX goals

**Who.** Friends gathering on one couch with one screen and 1–4 controllers.
**What they're trying to do.**

- "Find something *new* we haven't burnt out on."
- "Match the *vibe* of tonight's group" — chill / chaotic / competitive / co-op story.
- "Filter by *number of players* we actually have here."
- "Avoid online-only games that *look* multiplayer but aren't couch-friendly."

**UX principles**

- **Same-screen only.** Steam's `Shared/Split Screen` (cat 24), `Shared/Split Screen Co-op` (cat 39), `Shared/Split Screen PvP` (cat 40) are the canonical filters. Online-only multiplayer is excluded by default.
- **Mood over taxonomy.** Surface curated rails ("Party Night", "4-Player Couch Brawlers", "Co-op Adventures", "Pizza-and-Beer Easy", "Hardcore Versus") rather than dumping a flat genre grid.
- **Player-count first.** A prominent "We are N players" selector filters everything globally.
- **Fast.** SSR the discovery page so the first paint already shows curated content.

---

## 2. Tech stack

| Concern              | Choice |
|----------------------|--------|
| Framework            | TanStack Start (full-stack React, SSR, server functions, file-based routing) |
| UI                   | React 19 + Material UI v6 (`@mui/material`) + Emotion |
| Language             | TypeScript (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| Lint                 | ESLint 9 flat config + `typescript-eslint` strict-type-checked + stylistic + react-hooks |
| Build/dev            | Vite (via TanStack Start) |
| Data fetching client | `@tanstack/react-query` (bundled with Start) via loaders + server functions |
| Server-side cache    | In-memory LRU + TTL (Steam rate limit: 200 req / 5 min) |
| Package manager      | pnpm |

**Why TanStack Start:** server functions cleanly solve the Steam CORS problem (Steam blocks browser calls). Loaders + suspense give us route-level data fetching with SSR & streaming. Type-safe routes pair well with strict TS.

---

## 3. Data sources (Steam)

Steam doesn't expose a clean public game-search API; we combine three sources:

### 3a. Steam Storefront — `search/results`
`https://store.steampowered.com/search/results/?json=1&category3=<cat>&page=<n>`

- Lets us filter by **category3** (Shared/Split Screen = `24`, Co-op `9`, etc).
- Returns `{results_html, total_count, start}` — `results_html` is a fragment of `<a class="search_result_row" data-ds-appid=...>` tiles. We parse with `cheerio` server-side to extract `appid`, name, release date, review summary, price, capsule image.
- Supports sort via `filter=topsellers|newreleases|globaltopsellers`.
- Other params: `cc` (country code), `l` (locale), `os=win|mac|linux`.

### 3b. Steam Storefront — `appdetails`
`https://store.steampowered.com/api/appdetails/?appids=<id>&cc=<cc>&l=<lang>`

- Full details for **one** appid (multi-id is broken outside of `filters=price_overview`).
- Returns description, screenshots, movies, categories, genres, platforms, supported languages, recommendations, metacritic, price, dlcs, achievements.
- Used on the detail page.

### 3c. SteamSpy — `api.php`
`https://steamspy.com/api.php?request=tag&tag=Local+Co-Op`

- Tag-based discovery (`Local Co-Op`, `Local Multiplayer`, `Couch Co-Op`, `Split Screen`).
- Gives owner ranges, average playtime, top voted tags, score rank.
- Rate-limited (1 req/sec, 1 req/min for `all`). Refreshes daily — cache 24h.

### CORS / rate-limit strategy

- **All Steam calls go through TanStack Start `createServerFn` / API routes.** Browser never hits Steam directly.
- Server-side LRU cache:
  - search results: 30 min TTL
  - app details: 24 h TTL
  - SteamSpy: 24 h TTL (matches their refresh)
- Respect 429/403 with exponential backoff.
- Optional `STEAM_API_KEY` from `.env` — only required for the few official `api.steampowered.com` endpoints we may add later (e.g. `IStoreTopSellersService`). The two storefront endpoints above don't need a key.

---

## 4. Information architecture

```
/                        Discovery (the marquee page)
/browse                  Filterable catalog (player count, genre, price, sale, tags)
/game/$appid             Game detail page (screenshots, summary, why-it's-good, "buy on Steam")
/collections/$slug       Hand-curated themed lists (e.g. "/collections/party-night")
/about                   Why this site exists + data freshness notice
```

### Discovery page layout (`/`)

1. **Hero** — rotating spotlight game with a trailer/screenshot, 1-line pitch, "Play with N friends" badge, CTA to detail page.
2. **Player-count selector** — chip group: 2 / 3 / 4 / 5+ players. Persisted in URL search param + localStorage.
3. **Mood quiz entry** — 4 large cards: *Party Chaos*, *Brain & Strategy*, *Co-op Story*, *Versus / Sports*. Click → `/browse?mood=…`.
4. **Curated rails** (horizontal scroll, MUI cards):
   - "Tonight's hot couch hits" (top sellers in cat 24, last 30 days)
   - "Newly released couch games" (newreleases sort, cat 24)
   - "Crowd-pleasers under $15" (cat 24 + price filter)
   - "Hidden gems" (cat 24, owners < 200k, score rank > 80)
   - "Now on sale" (cat 24 + `specials=1`)
   - One rail per mood (Party / Brain / Story / Versus)
5. **Footer** — data attribution (Steam, SteamSpy), data freshness timestamp.

### Game card (compact)

Capsule image, title, player-count badge ("2-4 players, couch"), short tag line (top 2 user tags), price. On hover → mini-preview with a screenshot + "Add to shortlist" button.

### Game detail (`/game/$appid`)

- Hero screenshot/trailer, title, tags, player-count.
- One-paragraph "Why it works for couch night" (initially the Steam short_description; later editorialised).
- Screenshot carousel.
- Steam review summary + Metacritic.
- Categories chips (input devices, controller support, full controller).
- Big "Buy / view on Steam" CTA to `https://store.steampowered.com/app/$appid`.

---

## 5. Implementation phases

### Phase 1 — Foundation (this session)
- [ ] Scaffold TanStack Start project; pnpm, strict tsconfig, ESLint flat config (strict-type-checked + stylistic), Prettier.
- [ ] MUI + Emotion SSR set-up: emotion cache → injected into the SSR document, dark theme as default with a couch-friendly palette.
- [ ] `.env` handling: `STEAM_API_KEY` (optional), `STEAM_CC` (default `us`), `STEAM_LOCALE` (default `english`).
- [ ] Server-side Steam client module (`src/server/steam/`):
  - `searchByCategory({ categoryIds, sort, page, cc, lang })`
  - `getAppDetails(appid, { cc, lang })`
  - `getSteamSpyTag(tag)`
  - In-memory LRU cache wrapper with per-key TTL.
  - HTML parser for `results_html` (cheerio).
- [ ] Server functions exposing the above to the client.

### Phase 2 — Discovery page
- [ ] Root layout: AppBar with logo, player-count chip group, search button.
- [ ] `index.tsx` route with loaders prefetching: top-sellers, new releases, hidden gems, sale.
- [ ] `<GameRail>` component (horizontal scroll with snap).
- [ ] `<GameCard>` compact + expanded hover preview.
- [ ] Hero spotlight component pulling from a curated featured list.
- [ ] Mood entry cards.

### Phase 3 — Browse + detail
- [ ] `/browse` route with sidebar filters (player count, genre, price, sale, mood) → query params drive server function.
- [ ] `/game/$appid` route using `getAppDetails`.

### Phase 4 — Polish (out of scope unless time permits)
- [ ] Hand-curated `/collections/*` JSON files baked into the repo.
- [ ] Shortlist persistence in localStorage.
- [ ] Light theme toggle.
- [ ] Basic unit tests for the Steam HTML parser.

---

## 6. Quality bar

- `pnpm typecheck` → 0 errors.
- `pnpm lint` → 0 errors, 0 warnings under strict-type-checked.
- `pnpm dev` boots and the discovery page renders curated rails (real Steam data once a key is set; graceful skeleton state while loading or when Steam is unreachable).
- No `any`, no `// @ts-ignore`, no `eslint-disable` without a one-line justification.

---

## 7. Steam category cheat-sheet (for filter logic)

| ID  | Name                           | Use |
|-----|--------------------------------|-----|
| 1   | Multi-player                   | broad MP — too noisy alone |
| 9   | Co-op                          | online OR local |
| 24  | Shared/Split Screen            | **primary couch filter** |
| 27  | Cross-Platform Multiplayer     | informational only |
| 38  | Online Co-op                   | exclude on its own |
| 39  | Shared/Split Screen Co-op      | **primary** |
| 40  | Shared/Split Screen PvP        | **primary** |
| 47  | LAN Co-op                      | secondary |
| 48  | LAN PvP                        | secondary |
| 49  | PvP                            | broad |

Couchy's default search is `category3=24` (Shared/Split Screen) — the most reliable umbrella for same-screen play. Mood-specific rails further narrow with `39` (co-op) or `40` (versus).

---

## 8. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Steam search HTML structure changes | Parser is in one file (`src/server/steam/parseSearchHtml.ts`) with a small unit test. Failure → fall back to empty rail with skeleton. |
| Rate limiting (200/5min) | Server-side LRU cache; rails share one search call; SSR caches across requests. |
| `appdetails` is single-app-only | We only call it on the detail page, where it's fine. |
| MUI SSR hydration regressions in newer Start versions | Pin a Start version known to work with the official `start-material-ui` example; emotion cache injected on the server. |
| User has no Steam API key | The two storefront endpoints we depend on don't need one — site works without `STEAM_API_KEY`. Key is only read if present, for future official-API features. |
