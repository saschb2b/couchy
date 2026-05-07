# Couchy — house style for Claude

This file is loaded into every Claude session. Treat it as the authoritative
guide for this codebase. Read it before touching anything visual or copy-bearing.

## What Couchy is, in one paragraph

Couchy is a small, hand-curated discovery page for **same-screen multiplayer
games on Steam**. The audience is a group of friends in a living room with one
TV and 1–4 controllers, deciding what to play in the next ten minutes. Every UX
and copy decision should help that group skip a doomscroll, not impress a
designer's portfolio reviewer.

The full design brief lives in `GOALS.md`. Read that file once per major task.

---

## Copy guardrails — the AI-tells we don't ship

The site has been hand-tuned to not sound generative. Don't reintroduce these
patterns. They are the difference between "site built by a person" and "site
built by a chatbot".

### Hard no

- **No em dashes (`—`) in user-facing copy.** Replace with a period, a comma, or
  a sentence rewrite. Em dashes are the single strongest AI tell. The keyboard
  symbol does not exist in human-edited prose at the rate models emit it.
- **No "opinionated" / "thoughtful" / "carefully crafted" / "curated with
  intention"** etc. These are AI self-flattery words. If the curation is good,
  the user can tell. If it's not, calling it opinionated doesn't help.
- **No tricolons (`X, Y, Z` lists of three) in headlines or short copy** unless
  the three items genuinely belong together. "Plot, plan, betray." / "Brawlers,
  sports, party fighters." / "Loud, popular, hard to mess up." — pick one,
  rewrite the rest.
- **No "For when X needs to Y" / "For the night someone insists on Z"
  templates.** Once is voice. Twice is a tic.
- **No twee one-liners.** "Pizza-and-beer easy", "Buy before the next round of
  regret", "Save one mid-credits slot for snacks", "Settle it on the rug" — too
  precious. Cut.
- **No `…` (ellipsis) on loading copy.** Show a pending state on the actual
  button or the data placeholder. Don't write "Loading…" / "Talking to Steam…"
  as page-level text.
- **No "Welcome to Couchy" / "Discover the best couch games" generic banners.**
  The page itself is the welcome.

### Style targets

- Voice is **dry, terse, friendly**. Like a friend recommending, not a
  copywriter performing.
- Default to **one short sentence**. Two if you must. Three is suspicious.
- **Vary structure.** If the previous rail subtitle ended with a period, this
  one can end with a question. If the previous one was 8 words, this one is 4.
- **Prefer concrete verbs over adjectives.** "Crowd-pleasers" is fine. "Carefully
  curated crowd-pleasers" is AI.
- **Brand voice is allowed only on the discovery hero and the wordmark.**
  Everywhere else, copy should disappear into the layout.

---

## Visual guardrails

### Hard no

- **No arbitrary numbering** (`01 / 02 / 03`, `A / B / C`) on parallel things
  that aren't ranked. If five rails appear in a fixed order, a numeral implies
  a Top-5 list — they're just five rails.
- **No repeating the italic-accent-colour-on-a-single-word headline trick.**
  It's a signature move for the discovery hero only. Cloning it on `/browse`,
  `/game/$appid`, `/about` cheapens the original.
- **No MUI default `Chip` styling on customer-facing surfaces.** Hand-roll a
  bordered text label or a `Box` with the project's typography. The default
  pill chip with mid-grey background is the most recognisable "default MUI"
  smell in the world.
- **No `borderRadius: 999`** anywhere. The project's geometry is squared
  (2–4 px). One rounded element on the page would stand out as a mistake.
- **No multiple accent colours competing for attention.** Couch-amber
  (`#ffd166`) is the brand. Sale-green (`#a5db5f`) is functional. Brick-red
  (`#e0533c`) is rare and reserved for danger / a single mood. Don't add a
  fourth.
- **No emoji in copy or component text** unless the user explicitly asks.

### Style targets

- **Typography hierarchy is real.** Display (Fraunces) is reserved for the few
  moments it earns: discovery hero, page H1s, the footer wordmark, sometimes a
  pull-quote. Everything else is Inter.
- **Hairline borders, not panels.** Cards are a 1 px border, not a paper card
  with shadow.
- **Layout density should vary.** Hero is huge whitespace. Browse grid is
  denser. The rhythm matters.

---

## Engineering guardrails

### TypeScript & lint

- `pnpm typecheck` must be **0 errors** before any commit.
- `pnpm lint` must be **0 warnings** before any commit (we use
  `--max-warnings=0`).
- We run with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and
  `typescript-eslint`'s `strict-type-checked` + `stylistic-type-checked`. No
  `any`, no `// @ts-ignore`, no blanket `// eslint-disable-next-line`.
  Targeted disables with a one-line *why* are acceptable when the underlying
  rule is genuinely wrong for the case.
- Don't loosen tsconfig or eslint config to make a problem go away. Fix the
  problem.

### Steam data

- **All Steam calls go server-side** via `createServerFn` in
  `src/server/fns.ts`. Steam blocks CORS — there is no client-side fallback.
- **Cache everything.** Steam's rate limit is 200 req / 5 min and the
  storefront search is parsed HTML. Use `withCache(key, ttl, fetcher)` from
  `src/server/cache.ts`. Search results: 30 min. App details: 24 h.
- **Steam category IDs are landmines.** Verify a new id by inspecting
  `appdetails` for a known reference title (e.g. Brawlhalla = 291550 has 37
  for Shared/Split Screen PvP). The famous trap: **id `40` is "SteamVR
  Collectibles"**, not Split-Screen PvP — getting that wrong leaks Superhot VR
  into the couch versus rail. The verified ids live in
  `src/server/steam/categories.ts`; don't introduce literals elsewhere.
- **The non-game denylist** lives in `src/server/steam/parseSearchHtml.ts`.
  Subscriptions like EA Play and companion products like "Friend's Pass" /
  "Soundtrack" / "Demo" report `type: "game"` from `appdetails` so we filter
  them by appid + name pattern. Add a new entry there when one slips through;
  don't paper over it elsewhere.

### TanStack Start specifics

- The router entry exports a function called `getRouter` (not `createRouter`).
  Don't change the name without checking that the start plugin still picks it
  up.
- For dynamic background images on hero-class elements, use the plain inline
  `style={{ backgroundImage: ... }}` attribute, *not* MUI `sx`. Emotion
  doesn't reliably flush dynamic-URL styles into the SSR payload, and the
  empty hero is the most jarring possible regression.
- Search params on routes that have `validateSearch` are required by every
  `<Link to="/that-route">`. Update all links when you add a new search param.
- "Show more" / load-more navigations must use `resetScroll: false` on
  `navigate(...)`.

### Code style

- No comments that describe **what** the code does. Comments are for **why** —
  hidden constraints, surprising invariants, references to a bug we worked
  around.
- No multi-paragraph docstrings. One short line max if a comment is needed.
- No defensive code for impossible cases. Trust internal callers; validate at
  system boundaries (Steam responses, URL search params, server-fn input).
- Don't add abstractions for hypothetical future needs. Three similar lines
  is better than a premature abstraction.
- Prefer editing existing files over creating new ones.
- `Box` for layout, `Stack` for flex flows, `Container` for the page width
  cap. Don't reach for a third primitive.

---

## Pre-commit checklist

Run this in your head before any commit. If you can't say yes to all, fix
first.

- `pnpm typecheck` exits clean.
- `pnpm lint` exits clean with `--max-warnings=0`.
- I touched user-facing copy: searched the diff for `—`, "opinionated", "for
  when", "in season", "01 02 03". None present.
- I touched the catalog data flow: I verified my Steam category id by looking
  at a real `appdetails` response. Not by trusting a model.
- I added a new route or new search param: every `<Link>` to that route still
  type-checks.
- I added new copy: read it out loud. Does it sound like a friend writing a
  text, or like a chatbot writing a marketing page?

---

## Files of note

- `GOALS.md` — the full product/design brief. Read once per major task.
- `src/theme.ts` — the typography, palette, and component overrides.
- `src/server/steam/categories.ts` — the verified Steam category id table.
  Read the comment at the top before adding entries.
- `src/server/steam/parseSearchHtml.ts` — the parse-time non-game denylist.
- `src/server/cache.ts` — the in-memory TTL cache used for every Steam call.
- `src/components/Hero.tsx` — the discovery hero. The brand voice lives here.
  If a new page wants the same treatment, push back: only one hero gets it.
