import { createFileRoute } from '@tanstack/react-router';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useMemo } from 'react';
import { fetchDiscoveryRails } from '../server/fns';
import { Hero } from '../components/Hero';
import { MoodGrid } from '../components/MoodGrid';
import { GameRail } from '../components/GameRail';
import { buildSeoMeta, canonicalLink } from '../seo';
import type { SteamGameSummary } from '../server/steam/types';

const HOME_TITLE = 'Couchy · What should we play tonight?';
const HOME_DESCRIPTION =
  "Couch co-op picks for one screen and 1–4 controllers. Steam's same-screen catalog, hand-filtered so you can stop doomscrolling and start playing.";

export const Route = createFileRoute('/')({
  head: () => ({
    meta: buildSeoMeta({
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      path: '/',
    }),
    links: [canonicalLink('/')],
  }),
  loader: async () => {
    const payload = await fetchDiscoveryRails();
    return payload;
  },
  staleTime: 30 * 60 * 1000,
  component: DiscoveryPage,
  errorComponent: DiscoveryErrorState,
  pendingComponent: DiscoveryPendingState,
});

function DiscoveryPage() {
  const { rails, spotlights } = Route.useLoaderData();

  // Hero playlist: curated spotlights first (so the page opens with the
  // editorial pick), then the rest of the rail games for "near-endless"
  // channel-surf depth. Both filtered to clips with a trailer — the
  // Hero is video-first now, not still-image-first.
  const heroClips = useMemo(() => {
    const seen = new Set<number>();
    const out: SteamGameSummary[] = [];
    const push = (g: SteamGameSummary) => {
      if (g.trailerHls === null) return;
      if (seen.has(g.appid)) return;
      seen.add(g.appid);
      out.push(g);
    };
    for (const s of spotlights) push(s);
    for (const r of rails) {
      for (const g of r.games) push(g);
    }
    return out;
  }, [rails, spotlights]);

  return (
    <>
      <Box sx={{ mb: { xs: 8, md: 12 } }}>
        <Hero clips={heroClips} />
      </Box>
      <Container maxWidth="xl">
        <MoodGrid />
        {rails.length === 0 && (
          <Box sx={{ py: 10 }}>
            <Typography variant="h3" sx={{ fontStyle: 'italic', mb: 1 }}>
              Steam isn&apos;t picking up.
            </Typography>
            <Typography
              color="text.secondary"
              sx={{
                fontFamily: 'h1.fontFamily',
                fontStyle: 'italic',
                fontSize: 18,
                maxWidth: 520,
              }}
            >
              Probably a rate-limit blip on our end. Try again in a minute.
            </Typography>
          </Box>
        )}
        {rails.map((rail, i) => (
          <GameRail
            key={rail.key}
            title={rail.title}
            subtitle={rail.subtitle}
            games={rail.games}
            featured={i === 0}
            {...(rail.steamSearchUrl !== undefined && {
              steamSearchUrl: rail.steamSearchUrl,
            })}
          />
        ))}
      </Container>
    </>
  );
}

function DiscoveryPendingState() {
  return (
    <Container maxWidth="xl" sx={{ py: { xs: 12, md: 18 } }}>
      <Typography
        variant="h2"
        sx={{
          fontStyle: 'italic',
          fontSize: { xs: 36, md: 56 },
          mb: 2,
          maxWidth: '14ch',
        }}
      >
        One second.
      </Typography>
      <Typography
        color="text.secondary"
        sx={{
          fontFamily: 'h1.fontFamily',
          fontStyle: 'italic',
          fontSize: 18,
          maxWidth: 480,
        }}
      >
        Pulling tonight&apos;s picks from Steam.
      </Typography>
    </Container>
  );
}

function DiscoveryErrorState({ error }: { error: Error }) {
  return (
    <Container maxWidth="xl" sx={{ py: { xs: 12, md: 18 } }}>
      <Typography
        variant="h2"
        sx={{
          fontStyle: 'italic',
          fontSize: { xs: 36, md: 56 },
          mb: 2,
          maxWidth: '14ch',
        }}
      >
        Steam isn&apos;t picking up.
      </Typography>
      <Typography
        color="text.secondary"
        sx={{
          fontFamily: 'h1.fontFamily',
          fontStyle: 'italic',
          fontSize: 18,
          mb: 2,
          maxWidth: 520,
        }}
      >
        Probably a rate-limit blip on our end. Try again in a minute.
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {error.message}
      </Typography>
    </Container>
  );
}
