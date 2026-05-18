/**
 * Background cache warmer. Fires off the queries a typical visitor lands on
 * — discovery rails (homepage), the four `/browse` mood variants, and the
 * four party-size filters — so the first real user doesn't pay the
 * cold-cache tax. Without this, /browse?party=5 cold-loads in ~5-9 s while
 * the adaptive loop pulls multiple raw Steam pages; with this it lands
 * sub-200 ms from the in-memory cache.
 *
 * Each warm call is sequential so we don't burst-trip Steam's per-second
 * limiter. `searchCouchGames` internally fans out up to MAX_PARALLEL_PAGES
 * raw page requests in parallel — that's the right limit; we don't want
 * to multiply it by running multiple `searchCouchGames` calls concurrently.
 *
 * Errors are caught per-warm-step so a single transient Steam failure can't
 * crash the server boot. The next real-user request will refetch and fill
 * whatever the warmer missed.
 */
// Use the plain `run*` helpers, not the createServerFn wrappers. The
// server-fn callables require a TanStack Start request context
// (AsyncLocalStorage) which doesn't exist outside a real request — calling
// them from this background task fails with "No Start context found."
import { runFetchDiscoveryRails, runSearchCouchGames } from './fns';
import { STEAM_CATEGORY, STEAM_TAG } from './steam/categories';

let started = false;

export function startPrewarm(): void {
  if (started) return;
  started = true;
  // Defer briefly so server bootstrap (route registration, etc.) settles
  // before we start hammering Steam. Three seconds is enough for both
  // `pnpm dev` and the production `node server-entry.mjs` flow.
  setTimeout(() => {
    void runPrewarm();
  }, 3000);
}

interface MoodWarm {
  name: string;
  categoryIds: number[];
  tagIds?: number[];
}

const MOOD_WARMS: readonly MoodWarm[] = [
  { name: 'all', categoryIds: [STEAM_CATEGORY.sharedSplitScreen] },
  {
    name: 'party',
    categoryIds: [STEAM_CATEGORY.sharedSplitScreen],
    tagIds: [STEAM_TAG.partyGame],
  },
  {
    name: 'brain',
    categoryIds: [STEAM_CATEGORY.sharedSplitScreenCoop],
    tagIds: [STEAM_TAG.strategy],
  },
  {
    name: 'story',
    categoryIds: [STEAM_CATEGORY.sharedSplitScreenCoop],
    tagIds: [STEAM_TAG.storyRich],
  },
  { name: 'versus', categoryIds: [STEAM_CATEGORY.sharedSplitScreenPvp] },
];

const PARTY_WARMS: readonly number[] = [2, 3, 4, 5];

async function runPrewarm(): Promise<void> {
  const t0 = Date.now();
  log('starting');

  try {
    await runFetchDiscoveryRails();
    log('discovery rails warm');
  } catch (e) {
    log(`discovery rails failed: ${String(e)}`);
  }

  for (const mood of MOOD_WARMS) {
    try {
      await runSearchCouchGames({
        categoryIds: mood.categoryIds,
        ...(mood.tagIds !== undefined && { tagIds: mood.tagIds }),
        sort: 'topsellers',
        pageCount: 1,
      });
      log(`mood ${mood.name} warm`);
    } catch (e) {
      log(`mood ${mood.name} failed: ${String(e)}`);
    }
  }

  // Party variants on mood=all. The first 1-2 raw Steam pages are shared
  // with the mood=all warm above; the adaptive loop only pulls additional
  // pages for sparse filters (e.g. party=5+).
  for (const partySize of PARTY_WARMS) {
    try {
      await runSearchCouchGames({
        categoryIds: [STEAM_CATEGORY.sharedSplitScreen],
        sort: 'topsellers',
        pageCount: 1,
        partySize,
      });
      log(`party ${String(partySize)} warm`);
    } catch (e) {
      log(`party ${String(partySize)} failed: ${String(e)}`);
    }
  }

  log(`done in ${String(Date.now() - t0)}ms`);
}

function log(msg: string): void {
  console.log(`[prewarm] ${msg}`);
}
