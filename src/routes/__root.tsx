import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import type { EmotionCache } from '@emotion/cache';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useMemo } from 'react';
import { theme } from '../theme';
import { AppShell } from '../components/AppShell';
import {
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  buildSeoMeta,
  jsonLdScript,
} from '../seo';

const ROOT_DESCRIPTION =
  'A curated discovery page for couch / same-screen multiplayer games on Steam. Find your next pizza-and-controllers night in 30 seconds.';

const ROOT_TITLE = `${SITE_NAME} · ${SITE_TAGLINE}`;

// Schema.org WebSite JSON-LD. Picked up by Google for sitelinks searchbox
// and "About this result" snippets. The author Person is the same shape
// cant-hub uses, so the Knowledge Graph can connect the two.
const WEBSITE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  alternateName: 'Couchy — couch co-op on Steam',
  url: SITE_URL,
  description: ROOT_DESCRIPTION,
  inLanguage: 'en',
  author: {
    '@type': 'Person',
    name: 'Sascha Becker',
    url: 'https://saschb2b.com/',
  },
};

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#10131a' },
      { name: 'robots', content: 'index, follow' },
      { name: 'author', content: 'Sascha Becker' },
      ...buildSeoMeta({
        title: ROOT_TITLE,
        description: ROOT_DESCRIPTION,
        path: '/',
        imageAlt: 'Couchy — Steam couch co-op picks',
      }),
    ],
    links: [
      {
        rel: 'preconnect',
        href: 'https://shared.fastly.steamstatic.com',
      },
      {
        rel: 'preconnect',
        href: 'https://cdn.cloudflare.steamstatic.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,800&family=Inter:wght@400;500;600;700;800&display=swap',
      },
      // Canonical owned per-leaf-route — links don't dedup by `rel`, so a
      // root-level canonical would race with /browse, /game, etc.
    ],
    scripts: [
      jsonLdScript(WEBSITE_JSON_LD),
      // Umami auto-tracks SPA navigations via the History API, so a single
      // head-loaded async script covers every TanStack route.
      {
        async: true,
        src: 'https://umami.saschb2b.com/script.js',
        'data-website-id': 'c9d09f7c-888b-4c91-b17d-786b14eda960',
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  // Per-render Emotion cache. On the server this is freshly created for every
  // request (so concurrent requests can't poison each other's style insertions);
  // on the client it's stable across re-renders thanks to useMemo. React 19's
  // resource hoisting picks up the resulting <style data-precedence> tags and
  // moves them into <head>.
  const cache = useMemo<EmotionCache>(
    () => createCache({ key: 'mui', prepend: true }),
    [],
  );
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <CacheProvider value={cache}>
          <ThemeProvider theme={theme} defaultMode="dark">
            <CssBaseline />
            {children}
          </ThemeProvider>
        </CacheProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <RootDocument>
      <AppShell>
        <Outlet />
      </AppShell>
    </RootDocument>
  );
}

function NotFound() {
  return (
    <RootDocument>
      <AppShell>
        <div style={{ padding: 32 }}>
          <h1>Page not found</h1>
          <p>That page doesn't exist (yet).</p>
        </div>
      </AppShell>
    </RootDocument>
  );
}
