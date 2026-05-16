import { withCache } from '../cache';

/**
 * Local-play info for a single appid, sourced from PCGamingWiki.
 *
 * `min` and `max` are the local-player range as the wiki states it. We never
 * surface a min less than 1 or a max above 8 — anything beyond is either a
 * data-entry typo or a non-couch use case (raid lobbies, hot-seat brackets).
 *
 * `modes` is the wiki's `Local_modes` column verbatim (e.g. ["Co-op"],
 * ["Co-op", "Versus"]). It can be empty when the wiki entry omits it.
 */
export interface LocalPlayInfo {
  min: number;
  max: number;
  modes: string[];
}

const ENDPOINT = 'https://www.pcgamingwiki.com/w/api.php';
const TTL_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 500;
// Cargo's hard ceiling is 500/page. 20 pages covers 10k rows; the Local=true
// table is ~3,750 today so this is comfortable headroom for wiki growth.
const MAX_PAGES = 20;
const FETCH_TIMEOUT_MS = 15_000;
const COUCH_CAP = 8;
const USER_AGENT =
  'Mozilla/5.0 (compatible; Couchy/0.1; +https://github.com/couchy)';

interface CargoEnvelope {
  cargoquery?: { title?: CargoRow }[];
}

interface CargoRow {
  AppID?: string | null;
  PL?: string | null;
  M?: string | null;
}

/**
 * Returns the full local-play map for every PCGamingWiki entry where
 * `Local="true"` and a Steam appid is set. Cached 24h; one cold-start
 * fetch is ~8 paginated HTTP calls (~3,750 rows). Subsequent lookups
 * are an in-memory Map.get.
 *
 * Failures bubble up — callers are expected to `Promise.allSettled` this
 * alongside the Steam calls so a PCGW outage degrades to "no party-filter
 * data" instead of blanking the page.
 */
export async function loadPcgwLocalPlay(): Promise<ReadonlyMap<number, LocalPlayInfo>> {
  return withCache('pcgw:local-play', TTL_MS, fetchAll);
}

async function fetchAll(): Promise<ReadonlyMap<number, LocalPlayInfo>> {
  const out = new Map<number, LocalPlayInfo>();
  for (let page = 0; page < MAX_PAGES; page++) {
    const rows = await fetchPage(page * PAGE_SIZE);
    for (const row of rows) {
      const appids = parseAppIds(row.AppID);
      if (appids.length === 0) continue;
      const range = parsePlayerCount(row.PL);
      const modes = parseModes(row.M);
      const info: LocalPlayInfo = { ...range, modes };
      for (const appid of appids) {
        // First write wins — when a single wiki page lists several Steam
        // appids (re-release editions sharing one infobox), every appid
        // gets the same range.
        if (!out.has(appid)) out.set(appid, info);
      }
    }
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

async function fetchPage(offset: number): Promise<CargoRow[]> {
  const url = new URL(ENDPOINT);
  url.searchParams.set('action', 'cargoquery');
  url.searchParams.set('tables', 'Multiplayer,Infobox_game');
  url.searchParams.set('join_on', 'Multiplayer._pageName=Infobox_game._pageName');
  url.searchParams.set(
    'fields',
    'Infobox_game.Steam_AppID=AppID,Multiplayer.Local_players=PL,Multiplayer.Local_modes=M',
  );
  url.searchParams.set(
    'where',
    'Multiplayer.Local="true" AND Infobox_game.Steam_AppID HOLDS LIKE "%"',
  );
  url.searchParams.set('limit', String(PAGE_SIZE));
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('format', 'json');

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
      throw new Error(`PCGamingWiki responded ${String(res.status)} at offset ${String(offset)}`);
    }
    const json = (await res.json()) as CargoEnvelope;
    const items = json.cargoquery ?? [];
    return items
      .map((it) => it.title)
      .filter((t): t is CargoRow => t !== undefined);
  } finally {
    clearTimeout(timeout);
  }
}

function parseAppIds(raw: string | null | undefined): number[] {
  if (typeof raw !== 'string' || raw === '') return [];
  return raw
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/**
 * Parse the wiki's `Local_players` cell. Common shapes seen across ~3,750
 * rows: bare numbers ("4"), hyphen ranges ("2-4"), en-dash ("2–8"), and the
 * occasional " to " ("2 to 4"). Anything we can't parse is treated as
 * "local play, count unknown" — a permissive 2–8 range that matches any
 * party-size filter rather than vanishing the game from results.
 *
 * Single bare numbers default the floor to 2: when a wiki entry says
 * `Local_players=4` it almost always means up to 4 couch players, not "this
 * game only works with exactly 4 controllers". The one exception is "1",
 * which we faithfully preserve (rare; usually a data-entry oddity).
 */
function parsePlayerCount(raw: string | null | undefined): { min: number; max: number } {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { min: 2, max: COUCH_CAP };
  }
  const trimmed = raw.trim();

  const range = /^(\d+)\s*(?:[-–—]|to)\s*(\d+)$/i.exec(trimmed);
  if (range !== null) {
    const a = Number.parseInt(range[1] ?? '', 10);
    const b = Number.parseInt(range[2] ?? '', 10);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return clampRange(Math.min(a, b), Math.max(a, b));
    }
  }

  const single = /^(\d+)$/.exec(trimmed);
  if (single !== null) {
    const n = Number.parseInt(single[1] ?? '', 10);
    if (Number.isFinite(n)) {
      return clampRange(n === 1 ? 1 : 2, n);
    }
  }

  return { min: 2, max: COUCH_CAP };
}

function clampRange(min: number, max: number): { min: number; max: number } {
  const mn = Math.max(1, Math.min(min, COUCH_CAP));
  const mx = Math.max(mn, Math.min(max, COUCH_CAP));
  return { min: mn, max: mx };
}

function parseModes(raw: string | null | undefined): string[] {
  if (typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}
