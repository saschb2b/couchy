import { withCache } from '../cache';
import { parseSearchHtml } from './parseSearchHtml';
import { COUCH_PRIMARY_CATEGORY } from './categories';
import type { SteamSort } from './categories';
import type { SteamAppDetails, SteamSearchPage } from './types';

/**
 * Steam's couch catalog moves on the order of days (new releases, occasional
 * tag re-categorisations), not minutes. A 6-hour TTL means a prewarm pass
 * at server start carries one process through a typical workday, and warm
 * users never block on Steam. The trade-off is staleness for sale prices on
 * `?specials=true`; an in-progress sale could appear up to 6 h after it
 * ends, but Couchy is a discovery page not a sales tracker so that's fine.
 */
const SEARCH_TTL_MS = 6 * 60 * 60 * 1000;
const APPDETAILS_TTL_MS = 24 * 60 * 60 * 1000;

const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT =
  'Mozilla/5.0 (compatible; Couchy/0.1; +https://github.com/couchy)';

const STORE_BASE = 'https://store.steampowered.com';

interface SearchOptions {
  /** Steam category3 IDs to AND together (Steam supports comma-separated list). */
  categoryIds?: number[];
  /** Community tag IDs to AND with categories (Steam supports comma-separated). */
  tagIds?: number[];
  sort?: SteamSort;
  /** 0-indexed page; Steam returns 25 per page. */
  page?: number;
  /** Country code for prices. */
  cc?: string;
  /** Locale for store text. */
  lang?: string;
  /** Extra raw query-string params to merge in (e.g. specials=1). */
  extra?: Record<string, string>;
}

export async function searchSteam(opts: SearchOptions): Promise<SteamSearchPage> {
  const {
    categoryIds = [COUCH_PRIMARY_CATEGORY],
    tagIds,
    sort,
    page = 0,
    cc = process.env.STEAM_CC ?? 'us',
    lang = process.env.STEAM_LOCALE ?? 'english',
    extra,
  } = opts;

  const params = new URLSearchParams();
  params.set('infinite_scroll', '1');
  params.set('cc', cc);
  params.set('l', lang);
  params.set('start', String(page * 25));
  params.set('count', '25');
  if (categoryIds.length > 0) {
    params.set('category3', categoryIds.join(','));
  }
  if (tagIds !== undefined && tagIds.length > 0) {
    params.set('tags', tagIds.join(','));
  }
  if (sort !== undefined) {
    params.set('filter', sort);
  }
  if (extra !== undefined) {
    for (const [k, v] of Object.entries(extra)) {
      params.set(k, v);
    }
  }

  const url = `${STORE_BASE}/search/results/?${params.toString()}`;
  const cacheKey = `search:${url}`;

  return withCache(cacheKey, SEARCH_TTL_MS, async () => {
    const body = await fetchText(url);
    const { html, totalCount } = unwrapSearchResponse(body);
    return {
      totalCount,
      start: page * 25,
      games: parseSearchHtml(html),
      partial: false,
    };
  });
}

/**
 * Steam returns one of two shapes for `?infinite_scroll=1`. Residential IPs
 * get raw HTML with a `<div class="search_results_count">N</div>` element.
 * Datacenter IPs (Coolify, AWS, etc.) get a JSON envelope:
 *   { results_html: "<a class=\"search_result_row\" ...>", total_count: 852, ... }
 * cheerio finds the embedded anchors either way, but the count regex only
 * matches the residential shape, so the JSON-envelope case used to render
 * "25 of 0" in production. Detect by sniffing the first non-whitespace char.
 */
function unwrapSearchResponse(body: string): { html: string; totalCount: number } {
  const trimmed = body.trimStart();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as {
        results_html?: unknown;
        total_count?: unknown;
      };
      const html = typeof parsed.results_html === 'string' ? parsed.results_html : '';
      const total =
        typeof parsed.total_count === 'number'
          ? parsed.total_count
          : typeof parsed.total_count === 'string'
            ? Number.parseInt(parsed.total_count.replace(/,/g, ''), 10)
            : NaN;
      return { html, totalCount: Number.isFinite(total) ? total : 0 };
    } catch {
      // fall through to HTML parsing — better to render rows with totalCount=0
      // than to throw and blank the page.
    }
  }
  return { html: body, totalCount: extractTotalCount(body) };
}

type AppDetailsResponse = Record<string, { success: boolean; data?: SteamAppDetails }>;

export async function getAppDetails(
  appid: number,
  opts: { cc?: string; lang?: string } = {},
): Promise<SteamAppDetails | null> {
  const cc = opts.cc ?? process.env.STEAM_CC ?? 'us';
  const lang = opts.lang ?? process.env.STEAM_LOCALE ?? 'english';
  const url = `${STORE_BASE}/api/appdetails/?appids=${String(appid)}&cc=${cc}&l=${lang}`;
  const cacheKey = `appdetails:${url}`;

  return withCache(cacheKey, APPDETAILS_TTL_MS, async () => {
    const json = await fetchJson<AppDetailsResponse>(url);
    const wrapped = json[String(appid)];
    if (wrapped?.success !== true || wrapped.data === undefined) {
      return null;
    }
    return wrapped.data;
  });
}

async function fetchText(url: string): Promise<string> {
  const res = await fetchWithTimeout(url, {
    Accept: 'text/html,application/xhtml+xml,*/*',
    'X-Requested-With': 'XMLHttpRequest',
  });
  return res.text();
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetchWithTimeout(url, {
    Accept: 'application/json,text/plain,*/*',
  });
  return (await res.json()) as T;
}

async function fetchWithTimeout(
  url: string,
  extraHeaders: Record<string, string>,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        ...extraHeaders,
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Steam responded ${String(res.status)} for ${url}`);
    }
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

function extractTotalCount(html: string): number {
  // Steam renders the count as either:
  //   <div class="search_results_count">17,648 results match your search.</div>
  // or, when extra classes/attributes are tacked on by A/B variants:
  //   <div class="search_results_count something-else" data-x="y">17,648 ...</div>
  // The original regex required `>` immediately after the closing quote, so
  // any extra class/attr meant a 0 fall-through and "X of 0" in the UI.
  const match =
    /class="[^"]*\bsearch_results_count\b[^"]*"[^>]*>\s*([\d,]+)/.exec(html);
  if (match?.[1] === undefined) return 0;
  const num = Number.parseInt(match[1].replace(/,/g, ''), 10);
  return Number.isFinite(num) ? num : 0;
}
