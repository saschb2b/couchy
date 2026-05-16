import { getAppDetails } from './client';
import { loadPcgwLocalPlay } from './pcgw';
import type { LocalPlayInfo } from './pcgw';
import type { SteamAppDetails, SteamGameSummary } from './types';

/**
 * Strip HTML tags so the player-count regex doesn't match attribute values
 * or class names ("col_4" looks like "4 players" to a sloppy regex).
 */
function stripHtml(raw: string): string {
  return raw.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ');
}

/**
 * Pull a max-local-players count out of a game's marketing copy. Steam
 * doesn't expose a structured player-count field on `appdetails`, so we
 * scan `detailed_description` + `about_the_game` for "<n> players"
 * mentions and keep only the ones that occur in a local-play context.
 *
 * Local context = the keywords "local", "couch", "split[-]screen",
 * "shared[-]screen", "same[-]screen", or "hot[-]seat" within ~60 chars
 * of the number.
 *
 * Without that filter the parser confidently returns online caps as if
 * they were couch numbers (e.g. Stardew advertises "8 Player Farming!"
 * but has zero native PC split-screen). The strict filter means most
 * games end up with `null` — that's the right answer. A wrong chip is
 * worse than no chip on a discovery page that promises curation.
 *
 * Cap at 8 — couch nights realistically top out there, and the cap kills
 * the worst outliers (a fighting game advertising 16-player tournaments
 * within a paragraph that also mentions local versus).
 */
export function parseMaxPlayers(details: SteamAppDetails): number | null {
  const text = [details.detailed_description, details.about_the_game]
    .filter((s): s is string => typeof s === 'string')
    .map(stripHtml)
    .join('\n')
    .toLowerCase();
  if (text === '') return null;

  const localContext = /\b(local|couch|split[- ]?screen|shared[- ]?screen|same[- ]?screen|hot[- ]?seat)\b/;
  const phrase = /(\d{1,2})(?:\s*(?:[-–—]|to)\s*(\d{1,2}))?\s*[- ]?players?\b/g;

  let max = 0;
  for (const match of text.matchAll(phrase)) {
    const a = Number.parseInt(match[1] ?? '', 10);
    const b = match[2] !== undefined ? Number.parseInt(match[2], 10) : 0;
    const candidate = Math.max(Number.isFinite(a) ? a : 0, Number.isFinite(b) ? b : 0);
    if (candidate <= 1) continue;

    const idx = match.index;
    const start = Math.max(0, idx - 60);
    const end = Math.min(text.length, idx + match[0].length + 60);
    if (localContext.test(text.slice(start, end))) {
      max = Math.max(max, candidate);
    }
  }

  if (max <= 1) return null;
  return Math.min(max, 8);
}

/**
 * Best HLS trailer URL for hover playback. We pick the first movie because
 * Steam orders them with the headline trailer at index 0; later entries are
 * usually feature-specific clips.
 */
export function pickTrailerHls(details: SteamAppDetails): string | null {
  const movie = details.movies?.[0];
  return movie?.hls_h264 ?? null;
}

/**
 * Enrich a list of `SteamGameSummary` with max-player count, trailer URL, and
 * structured PCGamingWiki local-play data. `appdetails` calls are deduped by
 * appid and made in parallel; PCGW data is one cached bulk fetch shared
 * across the whole batch. Both upstreams cache for 24h.
 *
 * Failed lookups are silently dropped — the game still renders, just without
 * a player chip or hover trailer. Never throw out of here; the discovery
 * page must remain useful even when half of Steam's API is having a moment.
 */
export async function enrichGames<T extends SteamGameSummary>(
  games: readonly T[],
): Promise<T[]> {
  const unique = new Map<number, T>();
  for (const g of games) {
    if (!unique.has(g.appid)) unique.set(g.appid, g);
  }

  const enriched = new Map<number, { maxPlayers: number | null; trailerHls: string | null }>();
  const [, pcgwResult] = await Promise.all([
    Promise.all(
      [...unique.keys()].map(async (appid) => {
        try {
          const details = await getAppDetails(appid);
          if (details === null) return;
          enriched.set(appid, {
            maxPlayers: parseMaxPlayers(details),
            trailerHls: pickTrailerHls(details),
          });
        } catch {
          // Swallow: the game keeps its `null` defaults.
        }
      }),
    ),
    loadPcgwLocalPlay().catch((): ReadonlyMap<number, LocalPlayInfo> => new Map()),
  ]);

  return games.map((g) => {
    const extra = enriched.get(g.appid);
    const pcgw = pcgwResult.get(g.appid) ?? null;
    const localPlayers: SteamGameSummary['localPlayers'] =
      pcgw !== null
        ? { min: pcgw.min, max: pcgw.max, modes: pcgw.modes }
        : null;
    if (extra === undefined) {
      if (pcgw === null) return g;
      return { ...g, localPlayers };
    }
    return {
      ...g,
      maxPlayers: extra.maxPlayers,
      trailerHls: extra.trailerHls,
      localPlayers,
    };
  });
}
