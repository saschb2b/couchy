import { createFileRoute } from '@tanstack/react-router';
import { fetchTvClips } from '../server/fns';
import { TvViewer } from '../components/TvViewer';
import { buildSeoMeta, canonicalLink } from '../seo';

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
  loader: async () => {
    const clips = await fetchTvClips();
    return { clips };
  },
  // TV pool is large and changes slowly. Re-fetch at most once an hour.
  staleTime: 60 * 60 * 1000,
  component: TvPage,
});

function TvPage() {
  const { clips } = Route.useLoaderData();
  return <TvViewer clips={clips} />;
}
