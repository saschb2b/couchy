import type { JSX } from 'react';

/**
 * SEO helpers. One source of truth for the canonical host + the Open Graph /
 * Twitter / canonical meta shape per route. The TanStack `head()` function on
 * each route returns the array produced here; root-level defaults live in
 * `__root.tsx` so leaf routes can override just the bits they care about.
 *
 * Notes on meta dedup: TanStack matches metas by `name` or `property`. Setting
 * the same property on a leaf route overrides the root's value. That's why we
 * always include `og:title` / `og:description` etc. on routes that want their
 * own — partial overrides would inherit a stale root title.
 */

export const SITE_URL = 'https://couchy.saschb2b.com';
export const SITE_NAME = 'Couchy';
export const SITE_TAGLINE = 'Steam couch co-op picks';

/** Default Open Graph image (1200×630 PNG). Drop the file at `public/og.png`. */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og.png`;

interface SeoMeta {
  title: string;
  description: string;
  /** Path including leading slash, no trailing query unless meaningful. */
  path: string;
  /** Absolute URL for og:image. Falls back to DEFAULT_OG_IMAGE. */
  image?: string;
  /** Alt text for og:image. Strongly recommended when image is set. */
  imageAlt?: string;
  /** og:type — defaults to `website`. Use `video.other` for game pages. */
  ogType?: string;
}

/**
 * Build the full meta array (title, description, OG, Twitter) for a page.
 * Pair with `canonicalLink(path)` in the route's `links` and, when relevant,
 * `jsonLdScript(...)` in `scripts`.
 */
export function buildSeoMeta(opts: SeoMeta): Record<string, string>[] {
  const url = absoluteUrl(opts.path);
  const image = opts.image ?? DEFAULT_OG_IMAGE;
  const ogType = opts.ogType ?? 'website';
  const items: Record<string, string>[] = [
    { title: opts.title },
    { name: 'description', content: opts.description },
    { property: 'og:type', content: ogType },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:title', content: opts.title },
    { property: 'og:description', content: opts.description },
    { property: 'og:url', content: url },
    { property: 'og:image', content: image },
    { property: 'og:locale', content: 'en_US' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: opts.title },
    { name: 'twitter:description', content: opts.description },
    { name: 'twitter:image', content: image },
  ];
  if (opts.imageAlt !== undefined) {
    items.push({ property: 'og:image:alt', content: opts.imageAlt });
    items.push({ name: 'twitter:image:alt', content: opts.imageAlt });
  }
  return items;
}

/** Canonical link object for a given path. */
export function canonicalLink(path: string): JSX.IntrinsicElements['link'] {
  return { rel: 'canonical', href: absoluteUrl(path) };
}

/**
 * Render a Schema.org JSON-LD block as a TanStack-compatible script tag.
 * Place inside the route's `head().scripts` array.
 */
export function jsonLdScript(
  obj: Record<string, unknown>,
): JSX.IntrinsicElements['script'] {
  return {
    type: 'application/ld+json',
    children: JSON.stringify(obj),
  };
}

export function absoluteUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
