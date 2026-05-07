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
          <Box sx={{ py: 10 }}>
            <Typography
              variant="h3"
              sx={{ fontStyle: 'italic', mb: 1 }}
            >
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
        {rails.map((rail: DiscoveryRail) => (
          <GameRail
            key={rail.key}
            title={rail.title}
            subtitle={rail.subtitle}
            games={rail.games}
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
