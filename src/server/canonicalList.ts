/**
 * Per-tuple canonical lists. The model: for each unique
 * `(categoryIds, tagIds, sort, specials)` combination Steam can be queried
 * with, the server owns one growing, enriched, in-memory list. The reader
 * slices that list and applies cheap post-filters (`partySize`,
 * `maxPriceCents`); the builder pages through Steam in the background and
 * appends as new games come in. There is no per-request adaptive paging
 * and no re-enrichment across "load more" calls.
 *
 * What this fixes:
 *   - Pre-rewrite, every `pageCount` increment re-ran `fetchAndFilter`
 *     from page 0, re-enriching the whole accumulated set. Three-page
 *     browse navs were ~3× the cost of one-page browse navs.
 *   - The narrow prewarm enumeration (~10 of ~60 real combos) meant most
 *     users landed on a cold key. Now any key lazy-starts and only the
 *     first visitor per process pays the wait.
 *   - Adaptive paging would burst Steam for sparse filters (party=5+),
 *     occasionally tripping the rate limiter. The builder paces itself
 *     one page at a time with a fixed gap.
 *
 * What it doesn't try to be:
 *   - Persistent across restarts. State is in-process; a redeploy clears
 *     everything and the seed warm runs again. Memory cost is small
 *     enough (~tens of MB even at full coverage) that disk persistence
 *     isn't worth the moving parts.
 *   - Subscription/push for "the list grew". A user who scrolls past the
 *     current list size sees the grid end; their next visit reads the
 *     larger list. Intentional per the brief.
 */
import { searchSteam } from './steam/client';
import { enrichGames } from './steam/enrich';
import type { SteamSort } from './steam/categories';
import type { SteamGameSummary } from './steam/types';

export interface CanonicalTuple {
  categoryIds: readonly number[];
  tagIds?: readonly number[];
  sort?: SteamSort;
  specials?: boolean;
}

interface BuilderEntry {
  games: SteamGameSummary[];
  totalCount: number;
  completed: boolean;
  seen: Set<number>;
  firstBatchReady: Promise<void>;
  resolveFirstBatch: () => void;
  hasFirstBatch: boolean;
}

const builders = new Map<string, BuilderEntry>();

/**
 * Hard ceiling on canonical list size. 5000 is well past Steam's couch
 * cat-24 totalCount (~900 at time of writing) but bounds memory if a
 * future tuple matches a huge slice of Steam.
 */
const MAX_GAMES = 5000;
const MAX_PAGES = 200;
/**
 * Per-builder pause between successive Steam page fetches. Steam tolerates
 * ~200 req/5min cumulatively but burst-rejects short spikes. With one
 * builder this is 0.66 req/sec; with several lazy-started builders
 * running concurrently it stays well under Steam's per-second limiter.
 */
const PAGE_PAUSE_MS = 1500;
/**
 * Upper bound on the cold-start wait the very first caller pays. The
 * builder keeps running past this — the timeout only bounds how long the
 * reader holds the request open. A timeout leaves the list partially
 * filled; the next reader picks up wherever the builder is by then.
 */
const FIRST_BATCH_TIMEOUT_MS = 15_000;
const MAX_PAGE_RETRIES = 3;

function keyFor(t: CanonicalTuple): string {
  const cats = [...t.categoryIds].sort((a, b) => a - b).join(',');
  const tags =
    t.tagIds !== undefined ? [...t.tagIds].sort((a, b) => a - b).join(',') : '';
  const sort = t.sort ?? '';
  const sp = t.specials === true ? '1' : '0';
  return `${cats}|${tags}|${sort}|${sp}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureBuilder(t: CanonicalTuple): BuilderEntry {
  const key = keyFor(t);
  const existing = builders.get(key);
  if (existing !== undefined) return existing;

  // Definite-assignment: the Promise constructor runs its executor
  // synchronously, so `resolveFirstBatch` is set before the next line.
  let resolveFirstBatch!: () => void;
  const firstBatchReady = new Promise<void>((resolve) => {
    resolveFirstBatch = resolve;
  });

  const entry: BuilderEntry = {
    games: [],
    totalCount: 0,
    completed: false,
    seen: new Set<number>(),
    firstBatchReady,
    resolveFirstBatch,
    hasFirstBatch: false,
  };
  builders.set(key, entry);

  void runBuilder(t, entry).catch((e: unknown) => {
    // Builder crashed past its own retry handling. Mark complete so we
    // don't trap readers behind a dead loop, and release any waiters.
    console.error(`[canonical] builder ${key} crashed:`, e);
    finalize(entry);
  });

  return entry;
}

function finalize(entry: BuilderEntry): void {
  entry.completed = true;
  if (!entry.hasFirstBatch) {
    entry.hasFirstBatch = true;
    entry.resolveFirstBatch();
  }
}

async function fetchPageWithRetry(
  t: CanonicalTuple,
  page: number,
): Promise<{ totalCount: number; games: SteamGameSummary[] } | null> {
  for (let attempt = 0; attempt < MAX_PAGE_RETRIES; attempt++) {
    try {
      const result = await searchSteam({
        categoryIds: [...t.categoryIds],
        ...(t.tagIds !== undefined && { tagIds: [...t.tagIds] }),
        ...(t.sort !== undefined && { sort: t.sort }),
        page,
        ...(t.specials === true && { extra: { specials: '1' } }),
      });
      return { totalCount: result.totalCount, games: result.games };
    } catch {
      // 800ms / 1600ms / 2400ms. A genuine rate-limit usually clears in
      // under five seconds; deeper failures we'd rather surface as a
      // partially-filled list than as a wedged builder.
      await sleep(800 * (attempt + 1));
    }
  }
  return null;
}

async function runBuilder(t: CanonicalTuple, entry: BuilderEntry): Promise<void> {
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await fetchPageWithRetry(t, page);
    if (result === null) {
      finalize(entry);
      return;
    }
    if (page === 0) entry.totalCount = result.totalCount;

    const fresh = result.games.filter((g) => !entry.seen.has(g.appid));
    if (fresh.length === 0 && result.games.length === 0) {
      finalize(entry);
      return;
    }

    if (fresh.length > 0) {
      const enriched = await enrichGames(fresh);
      for (const g of enriched) {
        entry.seen.add(g.appid);
        entry.games.push(g);
      }
    }
    if (!entry.hasFirstBatch) {
      entry.hasFirstBatch = true;
      entry.resolveFirstBatch();
    }

    if (entry.games.length >= MAX_GAMES) {
      finalize(entry);
      return;
    }
    if (entry.totalCount > 0 && entry.games.length >= entry.totalCount) {
      finalize(entry);
      return;
    }

    await sleep(PAGE_PAUSE_MS);
  }
  finalize(entry);
}

interface ReadInput extends CanonicalTuple {
  offset: number;
  limit: number;
  partySize?: number;
  maxPriceCents?: number;
}

export interface CanonicalSlice {
  games: SteamGameSummary[];
  totalCount: number;
  completed: boolean;
  /** Size of the filtered list at read time. Useful for "X of Y" copy. */
  filteredSize: number;
}

function fitsParty(g: SteamGameSummary, partySize: number): boolean {
  if (partySize <= 0) return true;
  const lp = g.localPlayers;
  if (lp !== null) {
    return partySize >= lp.min && partySize <= lp.max;
  }
  if (g.maxPlayers !== null) {
    return partySize >= 2 && partySize <= g.maxPlayers;
  }
  return false;
}

function passesPrice(g: SteamGameSummary, maxPriceCents: number): boolean {
  return g.finalPriceCents !== null && g.finalPriceCents <= maxPriceCents;
}

/**
 * Read a slice of the canonical list for `(categoryIds, tagIds, sort,
 * specials)`. Lazy-starts the builder if absent. On a cold tuple the
 * first caller blocks up to `FIRST_BATCH_TIMEOUT_MS` for the first
 * enriched page; later callers see whatever the builder has accumulated
 * since.
 */
export async function readCanonicalList(input: ReadInput): Promise<CanonicalSlice> {
  const entry = ensureBuilder(input);
  await Promise.race([entry.firstBatchReady, sleep(FIRST_BATCH_TIMEOUT_MS)]);

  // Snapshot length so a builder append mid-read doesn't shift indices.
  const snapshot = entry.games.slice(0, entry.games.length);

  const partySize = input.partySize;
  const maxPrice = input.maxPriceCents;
  const hasPartyFilter = partySize !== undefined && partySize > 0;
  const hasPriceFilter = maxPrice !== undefined;

  const filtered: SteamGameSummary[] = [];
  for (const g of snapshot) {
    if (hasPartyFilter && !fitsParty(g, partySize)) continue;
    if (hasPriceFilter && !passesPrice(g, maxPrice)) continue;
    filtered.push(g);
  }

  return {
    games: filtered.slice(input.offset, input.offset + input.limit),
    totalCount: entry.totalCount,
    completed: entry.completed,
    filteredSize: filtered.length,
  };
}

/**
 * Kick off a builder without waiting for it. Used by `prewarm.ts` to
 * start filling the most likely landing tuple at server boot.
 */
export function prewarmCanonicalList(t: CanonicalTuple): void {
  ensureBuilder(t);
}
