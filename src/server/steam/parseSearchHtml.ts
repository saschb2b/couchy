import * as cheerio from 'cheerio';
import type { SteamGameSummary } from './types';

/**
 * Appids that show up in Steam search results but aren't actually playable games
 * — service subscriptions, store-front meta apps, etc. They report `type: "game"`
 * in the appdetails API so we can't filter them automatically.
 */
const NON_GAME_APPID_DENYLIST = new Set<number>([
  1289670, // EA Play — subscription
  1493710, // Steam Networking
]);

/**
 * Companion/secondary product titles that aren't standalone games.
 * Steam ships them as separate apps but they only make sense if you own the parent.
 */
const NON_GAME_NAME_PATTERNS: RegExp[] = [
  /\bFriend['’]s Pass\b/i,
  /\bSoundtrack\b/i,
  /\bDemo\b\s*$/i,
  /\bTrial\b\s*$/i,
  /\bDedicated Server\b/i,
];

/**
 * Parse the `results_html` fragment returned by the Steam search endpoint
 * into an array of game summaries. The fragment is a flat list of
 * <a class="search_result_row"> anchors.
 *
 * The same appid can appear multiple times in a Steam response (regional SKUs,
 * indexing quirks). We dedupe by appid, keeping the first occurrence.
 */
export function parseSearchHtml(html: string): SteamGameSummary[] {
  const $ = cheerio.load(html);
  const games: SteamGameSummary[] = [];
  const seen = new Set<number>();

  $('a.search_result_row').each((_index, el) => {
    const $row = $(el);
    const appidAttr = $row.attr('data-ds-appid');
    if (appidAttr === undefined || appidAttr === '') {
      return;
    }
    // Some rows are bundles or DLC — they may have `data-ds-bundleid` or `data-ds-packageid`.
    // We skip non-app rows here.
    if ($row.attr('data-ds-bundleid') !== undefined) {
      return;
    }
    if ($row.attr('data-ds-packageid') !== undefined) {
      return;
    }

    const appidNum = Number.parseInt(appidAttr, 10);
    if (!Number.isFinite(appidNum)) {
      return;
    }
    if (NON_GAME_APPID_DENYLIST.has(appidNum)) {
      return;
    }
    if (seen.has(appidNum)) {
      return;
    }

    const name = $row.find('.title').first().text().trim();
    if (name === '') {
      return;
    }
    if (NON_GAME_NAME_PATTERNS.some((re) => re.test(name))) {
      return;
    }

    const href = $row.attr('href') ?? `https://store.steampowered.com/app/${String(appidNum)}/`;

    const $img = $row.find('.search_capsule img').first();
    const capsuleImage =
      $img.attr('srcset')?.split(',').pop()?.trim().split(' ')[0] ??
      $img.attr('src') ??
      null;

    const releasedAt = $row.find('.search_released').first().text().trim() || null;

    const $review = $row.find('.search_review_summary').first();
    const reviewClasses = ($review.attr('class') ?? '').split(/\s+/);
    const reviewClass =
      reviewClasses.find(
        (c) => c !== 'search_review_summary' && c !== 'no_reviews' && c !== '',
      ) ?? null;
    const reviewSummary = $review.attr('data-tooltip-html')?.split('<br>')[0]?.trim() ?? null;

    const $price = $row.find('.search_price_discount_combined').first();
    const finalPriceRaw = $price.attr('data-price-final');
    const finalPriceCents =
      finalPriceRaw !== undefined && finalPriceRaw !== ''
        ? Number.parseInt(finalPriceRaw, 10)
        : null;

    const discountStr = $row.find('.search_discount span, .discount_pct').first().text().trim();
    const discountMatch = /-?(\d+)\s*%/.exec(discountStr);
    const discountPercent = discountMatch?.[1] !== undefined ? Number(discountMatch[1]) : 0;

    // When discounted, Steam renders both prices in dedicated nodes:
    //   .discount_original_price  → strikethrough
    //   .discount_final_price     → headline
    // When at full price, the markup falls back to a single `.search_price`.
    const finalPriceText =
      firstText($row.find('.discount_final_price')) ??
      firstText($row.find('.search_price')) ??
      null;
    const originalPriceText = firstText($row.find('.discount_original_price'));

    games.push({
      appid: appidNum,
      name,
      capsuleImage,
      releasedAt,
      reviewSummary,
      reviewClass,
      finalPriceCents: finalPriceCents !== null && Number.isFinite(finalPriceCents) ? finalPriceCents : null,
      discountPercent: Number.isFinite(discountPercent) ? discountPercent : 0,
      finalPriceDisplay: finalPriceText,
      originalPriceDisplay: originalPriceText,
      href,
    });
    seen.add(appidNum);
  });

  return games;
}

type CheerioCollection = ReturnType<ReturnType<typeof cheerio.load>>;

function firstText($el: CheerioCollection): string | null {
  const raw = $el.first().text().replace(/\s+/g, ' ').trim();
  return raw === '' ? null : raw;
}
