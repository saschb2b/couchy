import { getAppDetails } from './client';
import { parseMaxPlayers, pickTrailerHls } from './enrich';
import type { SteamAppDetails, SteamGameSummary } from './types';

/**
 * Hand-picked couch night staples. The list is intentionally short and
 * conservative: each game is verified to be genuinely playable on one couch
 * with one screen and is broadly enjoyable. When a pick goes off Steam or
 * loses its Shared/Split Screen tag, drop it. Add new entries deliberately,
 * not because they're trending.
 *
 * The list does two jobs:
 *
 * 1. Editorial layer — staples that we want anchoring the discovery feed
 *    even when sales rank pushes them off the topsellers cut. Most are
 *    also in cat 24, so without this rail they'd still surface; with it,
 *    they get a curated lane on the homepage.
 *
 * 2. Cat-24 backfill — genuine false negatives, where Steam's metadata
 *    misses the Shared/Split Screen tag. These would NOT appear in our
 *    category-filtered rails without the allowlist. Verified via
 *    `scripts/audit-picks.mjs` against the cat 37 (PvP shared/split) or
 *    cat 39 (Co-op shared/split) child tags — if Steam doesn't claim
 *    same-screen anywhere in the metadata, we don't override it.
 *
 * Review the list once a quarter; re-run the audit script then.
 */
interface EditorsPick {
  appid: number;
  /** Just for the comment / debugging — the canonical name comes from Steam. */
  name: string;
}

const PICKS: readonly EditorsPick[] = [
  // Editorial staples (all currently in cat 24).
  { appid: 413150, name: 'Stardew Valley' },
  { appid: 1426210, name: 'It Takes Two' },
  { appid: 291550, name: 'Brawlhalla' },
  { appid: 1971870, name: 'Mortal Kombat 1' },
  { appid: 448510, name: 'Overcooked! 2' },
  { appid: 268910, name: 'Cuphead' },
  { appid: 204360, name: 'Castle Crashers' },
  { appid: 1222700, name: 'A Way Out' },
  { appid: 252110, name: 'Lovers in a Dangerous Spacetime' },
  { appid: 35720, name: 'Trine 2: Complete Story' },
  { appid: 535520, name: 'Nidhogg 2' },
  { appid: 207140, name: 'SpeedRunners' },

  // Cat-24 backfill: cat 37/39 confirms local play, but cat 24 missing.
  { appid: 976310, name: 'Mortal Kombat 11' },
  { appid: 245170, name: 'Skullgirls 2nd Encore' },
  { appid: 574980, name: "Them's Fightin' Herds" },
  { appid: 22600, name: 'Worms Reloaded' },
];

export function editorsPickAppids(): readonly number[] {
  return PICKS.map((p) => p.appid);
}

/**
 * Resolve every editor's pick to a `SteamGameSummary`. Looks the appid up in
 * the candidate map first (free, since we already fetched it for another
 * rail), and falls back to a single `appdetails` call when it's not there.
 *
 * Picks that fail to resolve (delisted, region-locked, Steam returned 404)
 * are silently dropped — never crash the whole discovery page.
 */
export async function resolveEditorsPicks(
  fromCandidates: ReadonlyMap<number, SteamGameSummary>,
): Promise<SteamGameSummary[]> {
  const results = await Promise.all(
    PICKS.map(async (pick): Promise<SteamGameSummary | null> => {
      const cached = fromCandidates.get(pick.appid);
      if (cached !== undefined) return cached;
      try {
        const details = await getAppDetails(pick.appid);
        return details === null ? null : appDetailsToSummary(details);
      } catch {
        return null;
      }
    }),
  );
  return results.filter((g): g is SteamGameSummary => g !== null);
}

/** Map an `appdetails` response onto the leaner `SteamGameSummary` shape. */
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
