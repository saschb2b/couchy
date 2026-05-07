/**
 * Steam category IDs we care about for couch / same-screen play.
 * IDs come from the `category3=` query param on `store.steampowered.com/search`.
 */
export const STEAM_CATEGORY = {
  multiPlayer: 1,
  coop: 9,
  sharedSplitScreen: 24,
  crossPlatformMultiplayer: 27,
  onlineCoop: 38,
  sharedSplitScreenCoop: 39,
  sharedSplitScreenPvp: 40,
  fullControllerSupport: 28,
  partialControllerSupport: 18,
  lanCoop: 47,
  lanPvp: 48,
  pvp: 49,
} as const;

/** The umbrella filter we use for "couch games". */
export const COUCH_PRIMARY_CATEGORY = STEAM_CATEGORY.sharedSplitScreen;

/** Categories that mean "online-only" — we want to *exclude* these when they appear without a couch category. */
export const ONLINE_ONLY_CATEGORIES = new Set<number>([STEAM_CATEGORY.onlineCoop]);

export type SteamSort = 'topsellers' | 'newreleases' | 'globaltopsellers' | 'release_date';
