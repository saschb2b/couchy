import { createServerFn } from '@tanstack/react-start';
import { getAppDetails, searchSteam } from './steam/client';
import { STEAM_CATEGORY } from './steam/categories';
import type { SteamSort } from './steam/categories';
import type { SteamAppDetails, SteamGameSummary, SteamSearchPage } from './steam/types';
import { resolveEditorsPicks } from './steam/editorsPicks';
import { enrichGames } from './steam/enrich';
import { fetchSteamSpyTag, resolveTrendingCouchGames } from './steam/steamspy';

const VALID_SORTS = new Set<SteamSort>([
  'topsellers',
  'newreleases',
  'globaltopsellers',
  'release_date',
]);

export interface SearchInput {
  categoryIds?: number[];
  tagIds?: number[];
  sort?: SteamSort;
  /**
   * How many 25-game *result* pages the caller wants. With no filter that's
   * the raw page count; with a filter (`partySize`, `maxPriceCents`) the
   * server pages adaptively under the hood until that many matches exist.
   */
  pageCount?: number;
  specials?: boolean;
  maxPriceCents?: number;
  /**
   * Number of bodies on the couch tonight (2–8). When set, results are
   * filtered to games that fit that party using PCGamingWiki structured
   * data with the description-parsed `maxPlayers` as fallback. Server-side
   * so each user-visible "load more" returns a full batch of matches
   * instead of 25 raw results filtered down to a sparse handful.
   */
  partySize?: number;
}

/**
 * Server-side sanity ceiling on a single search call. Not a product cap —
 * Steam's `totalCount` is the real end. This just prevents a broken or
 * malicious client from asking for thousands of pages and burning our rate
 * limit. 200 × 25 = 5000 games is well past Steam's couch cat-24 total.
 */
const MAX_PAGE_COUNT = 200;

export interface DiscoveryRail {
  key: string;
  title: string;
  subtitle: string;
  games: SteamGameSummary[];
  /** When omitted, the rail won't render a "See all on Steam" link. */
  steamSearchUrl?: string;
}

export interface DiscoveryPayload {
  rails: DiscoveryRail[];
  /**
   * Pre-selected hero spotlights. Mixed daily from several rails so the hero
   * doesn't show the same editor's-picks set on every visit. Empty when no
   * rail has enough games (e.g. Steam outage).
   */
  spotlights: SteamGameSummary[];
}

function buildSteamSearchUrl(
  categoryIds: number[],
  sort?: SteamSort,
  specials?: boolean,
): string {
  const params = new URLSearchParams();
  params.set('category3', categoryIds.join(','));
  if (sort !== undefined) {
    params.set('filter', sort);
  }
  if (specials === true) {
    params.set('specials', '1');
  }
  return `https://store.steampowered.com/search/?${params.toString()}`;
}

function validateSearchInput(input: unknown): SearchInput {
  if (input === null || typeof input !== 'object') {
    return {};
  }
  const obj = input as Record<string, unknown>;
  const categoryIdsRaw = obj.categoryIds;
  const categoryIds = Array.isArray(categoryIdsRaw)
    ? categoryIdsRaw.filter((n): n is number => typeof n === 'number')
    : undefined;
  const tagIdsRaw = obj.tagIds;
  const tagIds = Array.isArray(tagIdsRaw)
    ? tagIdsRaw.filter((n): n is number => typeof n === 'number')
    : undefined;
  const sortRaw = obj.sort;
  const sort =
    typeof sortRaw === 'string' && VALID_SORTS.has(sortRaw as SteamSort)
      ? (sortRaw as SteamSort)
      : undefined;
  const pageCountRaw = obj.pageCount;
  const pageCount =
    typeof pageCountRaw === 'number' && Number.isFinite(pageCountRaw)
      ? Math.max(1, Math.min(MAX_PAGE_COUNT, Math.floor(pageCountRaw)))
      : undefined;
  const specials = typeof obj.specials === 'boolean' ? obj.specials : undefined;
  const maxPriceCents =
    typeof obj.maxPriceCents === 'number' ? obj.maxPriceCents : undefined;
  const partySizeRaw = obj.partySize;
  const partySize =
    typeof partySizeRaw === 'number' && Number.isFinite(partySizeRaw)
      ? Math.max(0, Math.min(8, Math.floor(partySizeRaw)))
      : undefined;
  const out: SearchInput = {};
  if (categoryIds !== undefined) out.categoryIds = categoryIds;
  if (tagIds !== undefined) out.tagIds = tagIds;
  if (sort !== undefined) out.sort = sort;
  if (pageCount !== undefined) out.pageCount = pageCount;
  if (specials !== undefined) out.specials = specials;
  if (maxPriceCents !== undefined) out.maxPriceCents = maxPriceCents;
  if (partySize !== undefined && partySize > 0) out.partySize = partySize;
  return out;
}

function validateAppidInput(input: unknown): { appid: number } {
  if (input === null || typeof input !== 'object') {
    throw new Error('appid is required');
  }
  const raw = (input as Record<string, unknown>).appid;
  const appid = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number(raw);
  if (!Number.isFinite(appid) || appid <= 0) {
    throw new Error('Invalid appid');
  }
  return { appid };
}

const SEARCH_PAGE_SIZE = 25;
/**
 * Hard cap on raw Steam pages fetched per call. Bounds the adaptive loop
 * when a filter matches a small slice of Steam's couch catalog (e.g.
 * `partySize=5+` — most cat-24 games don't fit 5 on the couch). 24 raw
 * pages = 600 candidate games scanned per "load more"; with caching, only
 * the first cold-cache user pays full freight.
 */
const MAX_RAW_PAGES_PER_REQUEST = 24;
/**
 * Max raw Steam page requests fired in one parallel wave. Steam tolerates
 * 200 req / 5 min cumulatively but rejects short bursts that overshoot
 * its per-second limiter. Without this cap a `pageCount=5` filtered load
 * fanned out 15 simultaneous fetches and the second one back-to-back
 * tripped the limiter, which surfaced as "Nothing matches." in the UI
 * for filters that should have returned a full page. 6 is empirically
 * the sweet spot: fast enough that cold loads finish in ~3 s, gentle
 * enough that exploratory clicking through filters doesn't trip Steam.
 */
const MAX_PARALLEL_PAGES = 6;

function fitsParty(game: SteamGameSummary, partySize: number): boolean {
  if (partySize <= 0) return true;
  const lp = game.localPlayers;
  if (lp !== null) {
    return partySize >= lp.min && partySize <= lp.max;
  }
  if (game.maxPlayers !== null) {
    return partySize >= 2 && partySize <= game.maxPlayers;
  }
  return false;
}

interface PostFetchFilters {
  partySize?: number;
  maxPriceCents?: number;
}

async function applyPostFetchFilters(
  games: readonly SteamGameSummary[],
  filters: PostFetchFilters,
): Promise<SteamGameSummary[]> {
  const maxPrice = filters.maxPriceCents;
  const priced =
    maxPrice !== undefined
      ? games.filter(
          (g) => g.finalPriceCents !== null && g.finalPriceCents <= maxPrice,
        )
      : [...games];
  const partySize = filters.partySize;
  if (partySize === undefined || partySize <= 0) {
    return enrichGames(priced);
  }
  // Party fit needs the PCGW/appdetails enrichment, so enrich first.
  const enriched = await enrichGames(priced);
  return enriched.filter((g) => fitsParty(g, partySize));
}

/**
 * Adaptive paging: fetch raw Steam pages in waves until we have enough
 * games that pass the user's filters, or we exhaust Steam / hit the
 * per-request cap. Without this, a sparse filter (party=5+) returned 25
 * raw results that the client filtered down to ~3 visible games per
 * "load more", which read as "loads only a few results" in user reports.
 */
async function fetchAndFilter(
  baseOpts: {
    categoryIds: number[];
    tagIds?: number[];
    sort?: SteamSort;
    extra?: Record<string, string>;
  },
  pageCount: number,
  filters: PostFetchFilters,
): Promise<SteamSearchPage> {
  const target = pageCount * SEARCH_PAGE_SIZE;
  const hasFilter =
    (filters.partySize !== undefined && filters.partySize > 0) ||
    filters.maxPriceCents !== undefined;
  const maxRawPages = hasFilter
    ? Math.min(pageCount * 6, MAX_RAW_PAGES_PER_REQUEST)
    : pageCount;
  // Start optimistic: with a filter we likely need more raw than the user
  // requested. 3x is empirically about right for party=5+ on cat 24, but
  // cap parallelism at `MAX_PARALLEL_PAGES` so we don't burst-trip Steam.
  const firstBatch = hasFilter
    ? Math.min(pageCount * 3, maxRawPages, MAX_PARALLEL_PAGES)
    : Math.min(pageCount, MAX_PARALLEL_PAGES);

  const seen = new Set<number>();
  const rawGames: SteamGameSummary[] = [];
  let totalCount = 0;
  let partial = false;
  let fetched = 0;

  // Returns true when any page in the batch rejected. Returning the flag
  // (instead of mutating a closured `let`) keeps ESLint's narrowing happy
  // and makes the partial-state propagation explicit at the call sites.
  const fetchBatch = async (from: number, to: number): Promise<boolean> => {
    let failedAny = false;
    const settled = await Promise.allSettled(
      Array.from({ length: to - from }, (_unused, i) =>
        searchSteam({ ...baseOpts, page: from + i }),
      ),
    );
    for (const r of settled) {
      if (r.status !== 'fulfilled') {
        failedAny = true;
        continue;
      }
      if (totalCount === 0) totalCount = r.value.totalCount;
      for (const g of r.value.games) {
        if (seen.has(g.appid)) continue;
        seen.add(g.appid);
        rawGames.push(g);
      }
    }
    fetched = to;
    return failedAny;
  };

  partial = await fetchBatch(0, firstBatch);

  while (
    hasFilter &&
    !partial &&
    fetched < maxRawPages &&
    (totalCount === 0 || fetched * SEARCH_PAGE_SIZE < totalCount)
  ) {
    const candidate = await applyPostFetchFilters(rawGames, filters);
    if (candidate.length >= target) {
      return {
        totalCount,
        start: 0,
        games: candidate.slice(0, target),
        partial,
      };
    }
    const nextBatchSize = Math.min(
      Math.max(2, pageCount),
      maxRawPages - fetched,
      MAX_PARALLEL_PAGES,
    );
    if (nextBatchSize <= 0) break;
    partial = await fetchBatch(fetched, fetched + nextBatchSize);
  }

  const final = await applyPostFetchFilters(rawGames, filters);
  return {
    totalCount,
    start: 0,
    games: final.slice(0, target),
    partial,
  };
}

/**
 * Pure async function the server fn delegates to. Exposed so background
 * cache-warm code (`prewarm.ts`) can drive the same logic without going
 * through TanStack Start's request-context-bound RPC wrapper, which
 * throws "No Start context found in AsyncLocalStorage" outside a request.
 */
export async function runSearchCouchGames(
  data: SearchInput,
): Promise<SteamSearchPage> {
  const extra: Record<string, string> = {};
  if (data.specials === true) {
    extra.specials = '1';
  }
  const pageCount = Math.max(1, Math.min(MAX_PAGE_COUNT, data.pageCount ?? 1));
  const categoryIds = data.categoryIds ?? [STEAM_CATEGORY.sharedSplitScreen];

  return fetchAndFilter(
    {
      categoryIds,
      ...(data.tagIds !== undefined && { tagIds: data.tagIds }),
      ...(data.sort !== undefined && { sort: data.sort }),
      ...(Object.keys(extra).length > 0 && { extra }),
    },
    pageCount,
    {
      ...(data.partySize !== undefined && { partySize: data.partySize }),
      ...(data.maxPriceCents !== undefined && {
        maxPriceCents: data.maxPriceCents,
      }),
    },
  );
}

export const searchCouchGames = createServerFn({ method: 'GET' })
  .inputValidator(validateSearchInput)
  .handler(async ({ data }): Promise<SteamSearchPage> => runSearchCouchGames(data));

export const fetchAppDetails = createServerFn({ method: 'GET' })
  .inputValidator(validateAppidInput)
  .handler(async ({ data }): Promise<SteamAppDetails | null> => {
    return getAppDetails(data.appid);
  });

/**
 * Fetch the same query across multiple pages and return a single deduped list.
 * Each page is independently cached by `searchSteam`, so a refresh after a
 * "show more" only hits Steam for new pages.
 */
async function searchPaged(
  opts: Parameters<typeof searchSteam>[0],
  pageCount: number,
): Promise<SteamGameSummary[]> {
  // `allSettled` so a single Steam 403 in one of the rail's candidate pages
  // doesn't take down the whole discovery payload. Rejected pages just drop;
  // the rail renders with whatever did succeed.
  const settled = await Promise.allSettled(
    Array.from({ length: pageCount }, (_unused, page) =>
      searchSteam({ ...opts, page }),
    ),
  );
  const seen = new Set<number>();
  const games: SteamGameSummary[] = [];
  for (const r of settled) {
    if (r.status !== 'fulfilled') continue;
    for (const g of r.value.games) {
      if (seen.has(g.appid)) continue;
      seen.add(g.appid);
      games.push(g);
    }
  }
  return games;
}

const RAIL_LIMIT = 14;
const MIN_RAIL_SIZE = 6;
const CANDIDATE_PAGES = 2;
const HERO_SPOTLIGHT_COUNT = 4;

/**
 * Rail keys to draw hero spotlights from, in preferred order. We pull one
 * game from each (seeded by day-of-epoch + key) so the hero mixes editorial,
 * trending, fresh, and discounted picks. Order matters: an earlier rail
 * fills its slot first and blocks the same appid in later rails.
 */
const HERO_RAIL_KEYS: readonly string[] = [
  'editors-picks',
  'trending-couch',
  'new-releases',
  'on-sale',
  'top-sellers',
];

/**
 * Pure async function the server fn delegates to. See `runSearchCouchGames`
 * for why this is split out (Start context requirement).
 */
export async function runFetchDiscoveryRails(): Promise<DiscoveryPayload> {
  const couch = STEAM_CATEGORY.sharedSplitScreen;
  const couchCoop = STEAM_CATEGORY.sharedSplitScreenCoop;
  const couchVersus = STEAM_CATEGORY.sharedSplitScreenPvp;

    // Fetch a wide candidate pool from each source in parallel. 2 pages × 25
    // ≈ 50 candidates each — plenty of slack for cross-rail dedup.
    const settled = await Promise.allSettled([
      searchPaged({ categoryIds: [couch], sort: 'topsellers' }, CANDIDATE_PAGES),
      searchPaged({ categoryIds: [couchCoop], sort: 'topsellers' }, CANDIDATE_PAGES),
      searchPaged({ categoryIds: [couchVersus], sort: 'topsellers' }, CANDIDATE_PAGES),
      searchPaged({ categoryIds: [couch], sort: 'newreleases' }, CANDIDATE_PAGES),
      searchPaged(
        { categoryIds: [couch], sort: 'topsellers', extra: { specials: '1' } },
        CANDIDATE_PAGES,
      ),
      fetchSteamSpyTag('Local Co-Op'),
    ]);
    const crowdPool =
      settled[0].status === 'fulfilled' ? settled[0].value : [];
    const coopPool =
      settled[1].status === 'fulfilled' ? settled[1].value : [];
    const versusPool =
      settled[2].status === 'fulfilled' ? settled[2].value : [];
    const newPool =
      settled[3].status === 'fulfilled' ? settled[3].value : [];
    const salePool =
      settled[4].status === 'fulfilled' ? settled[4].value : [];
    const trendingRanked =
      settled[5].status === 'fulfilled' ? settled[5].value : null;

    // Build appid → first-seen-summary map across every pool. Used so the
    // editor's picks rail can avoid an extra appdetails round-trip when a
    // pick is already in one of the search pools (Stardew, Brawlhalla, etc.
    // almost always are).
    const allCandidates = new Map<number, SteamGameSummary>();
    for (const pool of [crowdPool, coopPool, versusPool, newPool, salePool]) {
      for (const g of pool) {
        if (!allCandidates.has(g.appid)) allCandidates.set(g.appid, g);
      }
    }

    const [editorsPicks, trendingPool] = await Promise.all([
      resolveEditorsPicks(allCandidates),
      trendingRanked === null
        ? Promise.resolve([] as SteamGameSummary[])
        : resolveTrendingCouchGames(trendingRanked, allCandidates, RAIL_LIMIT * 2),
    ]);

    // Cross-rail dedup. Rails take in priority order; a game shown in an
    // earlier rail is removed from later candidate lists.
    const used = new Set<number>();
    const take = (
      candidates: SteamGameSummary[],
      limit = RAIL_LIMIT,
    ): SteamGameSummary[] => {
      const out: SteamGameSummary[] = [];
      for (const g of candidates) {
        if (used.has(g.appid)) continue;
        used.add(g.appid);
        out.push(g);
        if (out.length >= limit) break;
      }
      return out;
    };

    const rails: DiscoveryRail[] = [];

    if (editorsPicks.length >= 4) {
      const games = take(editorsPicks, editorsPicks.length);
      rails.push({
        key: 'editors-picks',
        title: 'Couch night staples',
        subtitle: 'A handful we keep coming back to.',
        games,
      });
    }

    rails.push({
      key: 'top-sellers',
      title: 'Crowd-pleasers',
      subtitle:
        "Popular and hard to mess up. Start here when nobody can agree on anything.",
      games: take(crowdPool),
      steamSearchUrl: buildSteamSearchUrl([couch], 'topsellers'),
    });

    if (trendingPool.length >= MIN_RAIL_SIZE) {
      rails.push({
        key: 'trending-couch',
        title: 'Trending on couch lately',
        subtitle: 'What couch players are firing up this week.',
        games: take(trendingPool),
      });
    }

    rails.push({
      key: 'co-op-adventures',
      title: 'Co-op campaigns',
      subtitle: 'Story games you play through together.',
      games: take(coopPool),
      steamSearchUrl: buildSteamSearchUrl([couchCoop], 'topsellers'),
    });

    rails.push({
      key: 'versus-brawlers',
      title: 'Versus',
      subtitle: 'Brawlers and party fighters. Somebody has to lose.',
      games: take(versusPool),
      steamSearchUrl: buildSteamSearchUrl([couchVersus], 'topsellers'),
    });

    rails.push({
      key: 'new-releases',
      title: 'New this season',
      subtitle:
        'Recently released. Worth a look before everyone has played them.',
      games: take(newPool),
      steamSearchUrl: buildSteamSearchUrl([couch], 'newreleases'),
    });

    rails.push({
      key: 'on-sale',
      title: 'On sale today',
      subtitle: 'Discounted on Steam right now.',
      games: take(salePool),
      steamSearchUrl: buildSteamSearchUrl([couch], 'topsellers', true),
    });

    // Drop rails that ended up too thin after dedup — better to omit than
    // to render a 2-card row.
    const finalRails = rails.filter((r) => r.games.length >= MIN_RAIL_SIZE);

    // Enrich every game we'll actually show with player-count + trailer URL.
    // One `appdetails` call per unique appid; cached 24h on the server, so
    // cold-start eats the latency once and every other render is free.
    const allGames = finalRails.flatMap((r) => r.games);
    const enriched = await enrichGames(allGames);
    const byAppid = new Map(enriched.map((g) => [g.appid, g]));
    const enrichedRails = finalRails.map((r) => ({
      ...r,
      games: r.games.map((g) => byAppid.get(g.appid) ?? g),
    }));

    const spotlights = buildSpotlights(enrichedRails, HERO_SPOTLIGHT_COUNT);

    return { rails: enrichedRails, spotlights };
}

export const fetchDiscoveryRails = createServerFn({ method: 'GET' }).handler(
  async (): Promise<DiscoveryPayload> => runFetchDiscoveryRails(),
);

/**
 * Pick the hero spotlight set. Pulls one game from each of `HERO_RAIL_KEYS`
 * in order, seeded by the current day-of-epoch so the same visitor on the
 * same day sees the same hero, but the set rotates every 24h. When a
 * preferred rail is missing or empty (e.g. SteamSpy outage), the slot is
 * skipped and later rails fill in.
 */
function buildSpotlights(
  rails: readonly DiscoveryRail[],
  count: number,
): SteamGameSummary[] {
  if (rails.length === 0) return [];
  const daySeed = Math.floor(Date.now() / 86_400_000);
  const byKey = new Map(rails.map((r) => [r.key, r]));
  const used = new Set<number>();
  const picked: SteamGameSummary[] = [];

  for (const key of HERO_RAIL_KEYS) {
    if (picked.length >= count) break;
    const games = byKey.get(key)?.games ?? [];
    if (games.length === 0) continue;
    const start = seededIndex(daySeed, key, games.length);
    for (let i = 0; i < games.length; i++) {
      const g = games[(start + i) % games.length];
      if (g === undefined || used.has(g.appid)) continue;
      picked.push(g);
      used.add(g.appid);
      break;
    }
  }

  // Backfill from any rail if we still don't have enough. Rare; happens when
  // most preferred rails were dropped for being thin.
  if (picked.length < count) {
    outer: for (const rail of rails) {
      for (const g of rail.games) {
        if (used.has(g.appid)) continue;
        picked.push(g);
        used.add(g.appid);
        if (picked.length >= count) break outer;
      }
    }
  }

  return picked;
}

function seededIndex(daySeed: number, key: string, modulo: number): number {
  if (modulo <= 0) return 0;
  let h = (daySeed ^ 0x9e3779b9) >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h % modulo;
}

// Trigger background cache warm-up on server boot. Dynamic import breaks
// the prewarm → fns → prewarm cycle and keeps the module out of any
// client bundle that happens to pull this file in for type info. Gated
// to prod + opt-in via env so `pnpm dev` doesn't fire 25 Steam requests
// every time vite restarts.
if (
  typeof window === 'undefined' &&
  (process.env.NODE_ENV === 'production' || process.env.PREWARM === '1')
) {
  void import('./prewarm').then((m) => {
    m.startPrewarm();
  });
}
