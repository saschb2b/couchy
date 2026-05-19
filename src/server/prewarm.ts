/**
 * Seed the canonical-list cache at server boot. Two things happen here:
 *
 *   1. `runFetchDiscoveryRails` runs once so the homepage is warm on the
 *      first request.
 *   2. The most likely `/browse` landing tuple — mood=all, topsellers,
 *      no specials — gets its canonical list builder kicked off. The
 *      builder paginates Steam in the background; subsequent visitors
 *      read from memory.
 *
 * Every other tuple lazy-starts the first time a user lands on it. There
 * used to be a wider enumeration here (5 moods × 4 party sizes) but those
 * are post-filters now and the lazy-start covers the rest.
 *
 * Errors are caught per step so a single transient Steam failure can't
 * crash boot. The next real request retries whatever the seed missed.
 */
import { runFetchDiscoveryRails } from './fns';
import { prewarmCanonicalList } from './canonicalList';
import { STEAM_CATEGORY } from './steam/categories';

let started = false;

export function startPrewarm(): void {
  if (started) return;
  started = true;
  // Brief defer so route registration finishes before we start hitting
  // Steam. Three seconds covers both `pnpm dev` and the production
  // `node server-entry.mjs` boot path.
  setTimeout(() => {
    void runPrewarm();
  }, 3000);
}

async function runPrewarm(): Promise<void> {
  const t0 = Date.now();
  log('starting');

  try {
    await runFetchDiscoveryRails();
    log('discovery rails warm');
  } catch (e) {
    log(`discovery rails failed: ${String(e)}`);
  }

  prewarmCanonicalList({
    categoryIds: [STEAM_CATEGORY.sharedSplitScreen],
    sort: 'topsellers',
    specials: false,
  });
  log('default browse tuple builder kicked off');

  log(`seed done in ${String(Date.now() - t0)}ms`);
}

function log(msg: string): void {
  console.log(`[prewarm] ${msg}`);
}
