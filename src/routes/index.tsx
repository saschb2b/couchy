import { createFileRoute } from '@tanstack/react-router';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { fetchDiscoveryRails } from '../server/fns';
import type { DiscoveryRail } from '../server/fns';
import { Hero } from '../components/Hero';
import { MoodGrid } from '../components/MoodGrid';
import { GameRail } from '../components/GameRail';

export const Route = createFileRoute('/')({
  loader: async () => {
    const rails = await fetchDiscoveryRails();
    return { rails };
  },
  staleTime: 30 * 60 * 1000,
  component: DiscoveryPage,
  errorComponent: DiscoveryErrorState,
  pendingComponent: DiscoveryPendingState,
});

function DiscoveryPage() {
  const { rails } = Route.useLoaderData();
  const spotlight = rails[0]?.games[0] ?? null;

  return (
    <>
      <Hero spotlight={spotlight} />
      <Container maxWidth="xl">
        <MoodGrid />
        {rails.length === 0 && (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography variant="h6">Steam isn't responding right now.</Typography>
            <Typography variant="body2" color="text.secondary">
              Try refreshing in a moment — Couchy proxies the Steam store and may be rate-limited.
            </Typography>
          </Box>
        )}
        {rails.map((rail: DiscoveryRail) => (
          <GameRail
            key={rail.key}
            title={rail.title}
            subtitle={rail.subtitle}
            games={rail.games}
            steamSearchUrl={rail.steamSearchUrl}
          />
        ))}
      </Container>
    </>
  );
}

function DiscoveryPendingState() {
  return (
    <Container maxWidth="xl" sx={{ py: 10, textAlign: 'center' }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Loading the couch picks…
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Talking to Steam. Should only take a second.
      </Typography>
    </Container>
  );
}

function DiscoveryErrorState({ error }: { error: Error }) {
  return (
    <Container maxWidth="xl" sx={{ py: 10, textAlign: 'center' }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Couldn't load the discovery feed.
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {error.message}
      </Typography>
    </Container>
  );
}
