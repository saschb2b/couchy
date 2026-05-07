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
  movies?: {
    id: number;
    name: string;
    thumbnail: string;
    webm: { '480': string; max: string };
    mp4: { '480': string; max: string };
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
}
