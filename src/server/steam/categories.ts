/**
 * Steam category IDs we care about for couch / same-screen play.
 * IDs come from the `category3=` query param on `store.steampowered.com/search`.
 *
 * These were verified by inspecting `appdetails` for known reference titles:
 *   - Brawlhalla (291550) and Mortal Kombat 1 (1971870) for Shared/Split Screen PvP
 *   - It Takes Two (1426210) and Stardew Valley (413150) for Co-op + LAN Co-op
 *
 * Be careful: `40` is "SteamVR Collectibles", NOT Shared/Split Screen PvP — getting
 * that wrong leaks single-player VR titles (Superhot VR, Job Simulator, etc.) into
 * the couch versus rail.
 */
export const STEAM_CATEGORY = {
  multiPlayer: 1,
  singlePlayer: 2,
  coop: 9,
  partialControllerSupport: 18,
  sharedSplitScreen: 24,
  crossPlatformMultiplayer: 27,
  fullControllerSupport: 28,
  onlinePvp: 36,
  sharedSplitScreenPvp: 37,
  onlineCoop: 38,
  sharedSplitScreenCoop: 39,
  /** id 40 is "SteamVR Collectibles" — intentionally NOT exposed. */
  remotePlayTogether: 44,
  lanPvp: 47,
  lanCoop: 48,
  pvp: 49,
  trackedControllerSupport: 52,
  vrSupported: 53,
} as const;

/** The umbrella filter we use for "couch games". */
export const COUCH_PRIMARY_CATEGORY = STEAM_CATEGORY.sharedSplitScreen;

/**
 * Couch / same-screen category ids — used by the detail page and any place we
 * want to highlight that a title is genuinely playable in the same room.
 */
export const COUCH_CATEGORY_IDS: ReadonlySet<number> = new Set<number>([
  STEAM_CATEGORY.sharedSplitScreen,
  STEAM_CATEGORY.sharedSplitScreenCoop,
  STEAM_CATEGORY.sharedSplitScreenPvp,
  STEAM_CATEGORY.lanCoop,
  STEAM_CATEGORY.lanPvp,
]);

export type SteamSort = 'topsellers' | 'newreleases' | 'globaltopsellers' | 'release_date';
