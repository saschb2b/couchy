/** Minimal game shape used by browse/discovery rails. */
export interface SteamGameSummary {
  appid: number;
  name: string;
  capsuleImage: string | null;
  releasedAt: string | null;
  reviewSummary: string | null;
  /** "positive" | "mixed" | "negative" | etc, derived from a CSS class. */
  reviewClass: string | null;
  /** Final price in cents. `null` when free or unavailable. */
  finalPriceCents: number | null;
  /** Discount percent (0-100). `0` when no discount. */
  discountPercent: number;
  /** Final price as Steam pre-formatted it ("$4.99", "Free to Play", "$19.99"). */
  finalPriceDisplay: string | null;
  /** Pre-discount price as Steam pre-formatted it. `null` when there's no discount. */
  originalPriceDisplay: string | null;
  href: string;
  /**
   * Max local players, parsed from the appdetails description. `null` when
   * the description doesn't contain a recognizable count — still couch-
   * playable, just not labelled. Source: `parseMaxPlayers`.
   */
  maxPlayers: number | null;
  /**
   * Structured local-play range from PCGamingWiki, when the wiki has the
   * game. Higher confidence than `maxPlayers` (regex over marketing copy):
   * the wiki carries `min` and `max` separately and a `modes` list. `null`
   * for games not in the wiki, in which case `maxPlayers` is the only
   * available signal.
   */
  localPlayers: { min: number; max: number; modes: string[] } | null;
  /** HLS trailer URL from `appdetails.movies[0].hls_h264`, when available. */
  trailerHls: string | null;
}

/** Raw `appdetails` response (we only type the fields we read). */
export interface SteamAppDetails {
  type: string;
  name: string;
  steam_appid: number;
  is_free: boolean;
  short_description: string;
  detailed_description?: string;
  about_the_game?: string;
  header_image: string;
  capsule_image?: string;
  capsule_imagev5?: string;
  website?: string | null;
  developers?: string[];
  publishers?: string[];
  screenshots?: { id: number; path_thumbnail: string; path_full: string }[];
  /**
   * Steam moved trailers to streaming formats some time in late 2024.
   * The legacy `webm` / `mp4` keys are gone; current schema returns
   * MPEG-DASH and HLS playlist URLs. Use `hls_h264` with a player.
   */
  movies?: {
    id: number;
    name: string;
    thumbnail: string;
    dash_av1?: string;
    dash_h264?: string;
    hls_h264?: string;
    highlight?: boolean;
  }[];
  categories?: { id: number; description: string }[];
  genres?: { id: string; description: string }[];
  platforms?: { windows: boolean; mac: boolean; linux: boolean };
  release_date?: { coming_soon: boolean; date: string };
  metacritic?: { score: number; url: string };
  recommendations?: { total: number };
  price_overview?: {
    currency: string;
    initial: number;
    final: number;
    discount_percent: number;
    initial_formatted: string;
    final_formatted: string;
  };
  supported_languages?: string;
}

export interface SteamSearchPage {
  totalCount: number;
  start: number;
  games: SteamGameSummary[];
  /**
   * Set when one or more requested pages failed (typically a 403/429 from
   * Steam's rate limiter). The `games` array is the contiguous prefix of
   * pages that did succeed. The browse UI uses this to halt auto-loading
   * and offer the user a deliberate retry instead of hammering Steam.
   */
  partial: boolean;
}
