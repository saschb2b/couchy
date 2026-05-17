import { createFileRoute } from '@tanstack/react-router';
import { fetchDiscoveryRails } from '../server/fns';
import { TvViewer } from '../components/TvViewer';
import { buildSeoMeta, canonicalLink } from '../seo';
import type { SteamGameSummary } from '../server/steam/types';

const TV_TITLE = "Couchy TV · Trailers on shuffle";
const TV_DESCRIPTION =
  "A near-endless retro-TV playlist of Steam couch-game trailers. Channel-surf for what to play tonight; save anything you want to come back to.";

export const Route = createFileRoute('/tv')({
  head: () => ({
    meta: buildSeoMeta({
      title: TV_TITLE,
      description: TV_DESCRIPTION,
      path: '/tv',
    }),
    links: [canonicalLink('/tv')],
  }),
  // /tv shares its data with /. Both pages call `fetchDiscoveryRails`,
  // which is a tree of cached `searchSteam` + `getAppDetails` calls; the
  // overlap means visiting one page warms the cache for the other and
  // we don't burn separate slices of Steam's 200-req/5-min budget. The
  // clip pool is smaller than a dedicated /tv fetch would yield (~50–80
  // games vs ~100+) but still "near-endless" for a sitting.
  loader: async () => {
    const payload = await fetchDiscoveryRails();
    const seen = new Set<number>();
    const clips: SteamGameSummary[] = [];
    const push = (g: SteamGameSummary) => {
      if (g.trailerHls === null) return;
      if (seen.has(g.appid)) return;
      seen.add(g.appid);
      clips.push(g);
    };
    for (const s of payload.spotlights) push(s);
    for (const r of payload.rails) {
      for (const g of r.games) push(g);
    }
    return { clips };
  },
  staleTime: 60 * 60 * 1000,
  component: TvPage,
});

function TvPage() {
  const { clips } = Route.useLoaderData();
  return <TvViewer clips={clips} />;
}
