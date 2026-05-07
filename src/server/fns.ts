import { createServerFn } from '@tanstack/react-start';
import { getAppDetails, searchSteam } from './steam/client';
import { STEAM_CATEGORY } from './steam/categories';
import type { SteamSort } from './steam/categories';
import type { SteamAppDetails, SteamGameSummary, SteamSearchPage } from './steam/types';
import { resolveEditorsPicks } from './steam/editorsPicks';

const VALID_SORTS = new Set<SteamSort>([
  'topsellers',
  'newreleases',
  'globaltopsellers',
  'release_date',
]);

export interface SearchInput {
  categoryIds?: number[];
  sort?: SteamSort;
  /** Number of 25-result pages to fetch and concatenate. Defaults to 1. */
  pageCount?: number;
  specials?: boolean;
  maxPriceCents?: number;
}

const MAX_PAGE_COUNT = 8;

export interface DiscoveryRail {
  key: string;
  title: string;
  subtitle: string;
  games: SteamGameSummary[];
  /** When omitted, the rail won't render a "See all on Steam" link. */
  steamSearchUrl?: string;
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
  const out: SearchInput = {};
  if (categoryIds !== undefined) out.categoryIds = categoryIds;
  if (sort !== undefined) out.sort = sort;
  if (pageCount !== undefined) out.pageCount = pageCount;
  if (specials !== undefined) out.specials = specials;
  if (maxPriceCents !== undefined) out.maxPriceCents = maxPriceCents;
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

export const searchCouchGames = createServerFn({ method: 'GET' })
  .inputValidator(validateSearchInput)
  .handler(async ({ data }): Promise<SteamSearchPage> => {
    const extra: Record<string, string> = {};
    if (data.specials === true) {
      extra.specials = '1';
    }
    const pageCount = Math.max(1, Math.min(MAX_PAGE_COUNT, data.pageCount ?? 1));
    const categoryIds = data.categoryIds ?? [STEAM_CATEGORY.sharedSplitScreen];

    const pages = await Promise.all(
      Array.from({ length: pageCount }, (_unused, page) =>
        searchSteam({
          categoryIds,
          ...(data.sort !== undefined && { sort: data.sort }),
          page,
          ...(Object.keys(extra).length > 0 && { extra }),
        }),
      ),
    );

    const seen = new Set<number>();
    const games: SteamGameSummary[] = [];
    for (const p of pages) {
      for (const g of p.games) {
        if (seen.has(g.appid)) continue;
        seen.add(g.appid);
        games.push(g);
      }
    }

    const totalCount = pages[0]?.totalCount ?? 0;
    const max = data.maxPriceCents;
    const filtered =
      max !== undefined
        ? games.filter((g) => g.finalPriceCents !== null && g.finalPriceCents <= max)
        : games;

    return {
      totalCount,
      start: 0,
      games: filtered,
    };
  });

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
  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_unused, page) =>
      searchSteam({ ...opts, page }),
    ),
  );
  const seen = new Set<number>();
  const games: SteamGameSummary[] = [];
  for (const p of pages) {
    for (const g of p.games) {
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

export const fetchDiscoveryRails = createServerFn({ method: 'GET' }).handler(
  async (): Promise<DiscoveryRail[]> => {
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
    ]);
    const pools = settled.map((s) =>
      s.status === 'fulfilled' ? s.value : ([] as SteamGameSummary[]),
    );
    const crowdPool = pools[0] ?? [];
    const coopPool = pools[1] ?? [];
    const versusPool = pools[2] ?? [];
    const newPool = pools[3] ?? [];
    const salePool = pools[4] ?? [];

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

    const editorsPicks = await resolveEditorsPicks(allCandidates);

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
    return rails.filter((r) => r.games.length >= MIN_RAIL_SIZE);
  },
);
