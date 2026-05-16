import { withCache } from '../cache';
import { STEAM_CATEGORY } from './categories';
import { getAppDetails } from './client';
import { pickTrailerHls, parseMaxPlayers } from './enrich';
import type { SteamAppDetails, SteamGameSummary } from './types';

/**
 * Strict same-screen category gate for SteamSpy candidates. We intentionally
 * exclude the LAN family (47/48) because community "Local Co-Op" tagging is
 * generous — Among Us, for example, has lanCoop/lanPvp on its `appdetails`
 * but no actual couch mode, and would leak into the trending rail otherwise.
 * Brawlhalla / It Takes Two / Split Fiction / Rocket League all carry at
 * least one of these three, so the gate doesn't cost real couch games.
 */
const STRICT_COUCH_CATEGORY_IDS: ReadonlySet<number> = new Set<number>([
  STEAM_CATEGORY.sharedSplitScreen,
  STEAM_CATEGORY.sharedSplitScreenPvp,
  STEAM_CATEGORY.sharedSplitScreenCoop,
]);

const STEAMSPY_BASE = 'https://steamspy.com/api.php';
const TAG_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT =
  'Mozilla/5.0 (compatible; Couchy/0.1; +https://github.com/couchy)';

/**
 * How many of SteamSpy's top-ranked entries we'll resolve through `appdetails`
 * for the cat-24 safety check. Larger numbers give the trending rail more
 * runway after the filter but cost one cached `appdetails` call each on the
 * cold path. 40 leaves comfortable headroom for the ~14-card rail even when
 * the community tag is generous.
 */
const TRENDING_CANDIDATE_LIMIT = 40;

interface SteamSpyEntry {
  appid: number;
  name: string;
  ccu: number;
  averageTwoWeeks: number;
}

export interface SteamSpyRanked {
  /** appids ordered by recent activity (ccu, tie-broken by average_2weeks). */
  appids: number[];
  byAppid: ReadonlyMap<number, SteamSpyEntry>;
}

/**
 * Fetch a SteamSpy tag bucket and rank its games by current concurrent users.
 *
 * SteamSpy refreshes tag data roughly daily; the 24h TTL aligns with that.
 * The endpoint is unauthenticated. Failures bubble up — callers wrap in
 * `Promise.allSettled` so a SteamSpy outage degrades to "no trending rail"
 * instead of blanking the page.
 */
export async function fetchSteamSpyTag(tag: string): Promise<SteamSpyRanked> {
  const url = `${STEAMSPY_BASE}?request=tag&tag=${encodeURIComponent(tag)}`;
  const cacheKey = `steamspy:${url}`;
  return withCache(cacheKey, TAG_TTL_MS, async () => {
    const raw = await fetchSteamSpyJson(url);
    return rankByActivity(raw);
  });
}

/**
 * Resolve a SteamSpy ranking into couch-safe game summaries.
 *
 * SteamSpy ranks by the community "Local Co-Op" tag, which catches more games
 * than Steam's stricter cat-24 metadata but also misidentifies a few (community
 * tags drift). We use SteamSpy purely as a ranking signal and re-check each
 * top candidate's actual Steam categories before letting it onto the rail.
 *
 * Picks already in `fromCandidates` are reused without another network call;
 * the rest get one cached `appdetails` lookup each.
 */
export async function resolveTrendingCouchGames(
  ranking: SteamSpyRanked,
  fromCandidates: ReadonlyMap<number, SteamGameSummary>,
  limit: number,
): Promise<SteamGameSummary[]> {
  const candidates = ranking.appids.slice(0, TRENDING_CANDIDATE_LIMIT);

  const resolved = await Promise.all(
    candidates.map(
      async (appid): Promise<{ game: SteamGameSummary; verified: boolean } | null> => {
        const cached = fromCandidates.get(appid);
        if (cached !== undefined) {
          // The candidate came from a cat-24 search, so it's already verified.
          return { game: cached, verified: true };
        }
        try {
          const details = await getAppDetails(appid);
          if (details === null) return null;
          if (!hasCouchCategory(details)) return null;
          return { game: appDetailsToSummary(details), verified: true };
        } catch {
          return null;
        }
      },
    ),
  );

  const out: SteamGameSummary[] = [];
  for (const entry of resolved) {
    if (entry === null) continue;
    out.push(entry.game);
    if (out.length >= limit) break;
  }
  return out;
}

function hasCouchCategory(details: SteamAppDetails): boolean {
  const cats = details.categories;
  if (cats === undefined) return false;
  return cats.some((c) => STRICT_COUCH_CATEGORY_IDS.has(c.id));
}

function appDetailsToSummary(d: SteamAppDetails): SteamGameSummary {
  const price = d.price_overview;
  const onSale = price !== undefined && price.discount_percent > 0;
  return {
    appid: d.steam_appid,
    name: d.name,
    capsuleImage: d.capsule_image ?? d.header_image,
    releasedAt: d.release_date?.date ?? null,
    reviewSummary: null,
    reviewClass: null,
    finalPriceCents:
      price !== undefined ? price.final : d.is_free ? 0 : null,
    discountPercent: price?.discount_percent ?? 0,
    finalPriceDisplay:
      price !== undefined
        ? price.final_formatted
        : d.is_free
          ? 'Free to play'
          : null,
    originalPriceDisplay: onSale ? price.initial_formatted : null,
    href: `https://store.steampowered.com/app/${String(d.steam_appid)}/`,
    maxPlayers: parseMaxPlayers(d),
    trailerHls: pickTrailerHls(d),
  };
}

async function fetchSteamSpyJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`SteamSpy responded ${String(res.status)} for ${url}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

function rankByActivity(raw: unknown): SteamSpyRanked {
  if (raw === null || typeof raw !== 'object') {
    return { appids: [], byAppid: new Map() };
  }
  const entries: SteamSpyEntry[] = [];
  for (const v of Object.values(raw as Record<string, unknown>)) {
    if (v === null || typeof v !== 'object') continue;
    const row = v as Record<string, unknown>;
    if (typeof row.appid !== 'number' || typeof row.name !== 'string') continue;
    entries.push({
      appid: row.appid,
      name: row.name,
      ccu: toNumber(row.ccu),
      averageTwoWeeks: toNumber(row.average_2weeks),
    });
  }
  entries.sort(
    (a, b) => b.ccu - a.ccu || b.averageTwoWeeks - a.averageTwoWeeks,
  );
  return {
    appids: entries.map((e) => e.appid),
    byAppid: new Map(entries.map((e) => [e.appid, e])),
  };
}

function toNumber(raw: unknown): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (typeof raw === 'string') {
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
