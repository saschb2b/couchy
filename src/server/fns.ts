import { createServerFn } from '@tanstack/react-start';
import { getAppDetails, searchSteam } from './steam/client';
import { STEAM_CATEGORY } from './steam/categories';
import type { SteamSort } from './steam/categories';
import type { SteamAppDetails, SteamGameSummary, SteamSearchPage } from './steam/types';

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
  steamSearchUrl: string;
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

export const fetchDiscoveryRails = createServerFn({ method: 'GET' }).handler(
  async (): Promise<DiscoveryRail[]> => {
    const couch = STEAM_CATEGORY.sharedSplitScreen;
    const couchCoop = STEAM_CATEGORY.sharedSplitScreenCoop;
    const couchVersus = STEAM_CATEGORY.sharedSplitScreenPvp;

    const requests = [
      {
        key: 'top-sellers',
        title: "Tonight's hot couch hits",
        subtitle: 'Top sellers right now with same-screen support',
        categoryIds: [couch],
        sort: 'topsellers' as SteamSort,
      },
      {
        key: 'new-releases',
        title: 'Fresh off the press',
        subtitle: 'New same-screen releases worth a look',
        categoryIds: [couch],
        sort: 'newreleases' as SteamSort,
      },
      {
        key: 'co-op-adventures',
        title: 'Couch co-op adventures',
        subtitle: 'Tackle a campaign together on one couch',
        categoryIds: [couchCoop],
        sort: 'topsellers' as SteamSort,
      },
      {
        key: 'versus-brawlers',
        title: 'Couch versus & brawlers',
        subtitle: 'Pick a fighter, settle the rivalry',
        categoryIds: [couchVersus],
        sort: 'topsellers' as SteamSort,
      },
      {
        key: 'on-sale',
        title: 'Couch picks on sale',
        subtitle: 'Same-screen games discounted right now',
        categoryIds: [couch],
        sort: 'topsellers' as SteamSort,
        specials: true,
      },
    ];

    const results = await Promise.allSettled(
      requests.map(async (req) => {
        const extra: Record<string, string> = {};
        if (req.specials === true) {
          extra.specials = '1';
        }
        const page = await searchSteam({
          categoryIds: req.categoryIds,
          sort: req.sort,
          ...(Object.keys(extra).length > 0 && { extra }),
        });
        return { req, page };
      }),
    );

    const rails: DiscoveryRail[] = [];
    for (const result of results) {
      if (result.status !== 'fulfilled') {
        continue;
      }
      const { req, page } = result.value;
      rails.push({
        key: req.key,
        title: req.title,
        subtitle: req.subtitle,
        games: page.games.slice(0, 14),
        steamSearchUrl: buildSteamSearchUrl(req.categoryIds, req.sort, req.specials),
      });
    }
    return rails;
  },
);
