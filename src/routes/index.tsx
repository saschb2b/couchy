import { createFileRoute, useNavigate } from '@tanstack/react-router';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { fetchDiscoveryRails } from '../server/fns';
import type { DiscoveryRail } from '../server/fns';
import { Hero } from '../components/Hero';
import { MoodGrid } from '../components/MoodGrid';
import { GameRail } from '../components/GameRail';

interface IndexSearch {
  players?: number;
}

const HERO_SPOTLIGHT_COUNT = 4;
const VALID_PLAYER_COUNTS = new Set([2, 3, 4, 5]);

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): IndexSearch => {
    const raw = search.players;
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
    if (Number.isFinite(n) && VALID_PLAYER_COUNTS.has(n)) {
      return { players: n };
    }
    return {};
  },
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
  const { players } = Route.useSearch();
  const navigate = useNavigate();

  // Player-count filter. `5` means 5+. Filter logic is deliberately
  // generous: only hide a game when we have a *confirmed* local count
  // that's smaller than the requested party (e.g. drop "It Takes Two"
  // when the user picks 4). Games with no confirmed count stay in —
  // they're all cat-24 flagged, so we know they support couch play, we
  // just can't verify the exact ceiling.
  const filteredRails: DiscoveryRail[] =
    players === undefined
      ? rails
      : rails
          .map((r) => ({
            ...r,
            games: r.games.filter(
              (g) => g.maxPlayers === null || g.maxPlayers >= players,
            ),
          }))
          .filter((r) => r.games.length > 0);

  const spotlights = (filteredRails[0]?.games ?? []).slice(0, HERO_SPOTLIGHT_COUNT);
  const allEmpty = filteredRails.length === 0;

  const onPlayerCountChange = (next: number | null) => {
    void navigate({
      to: '/',
      search: next === null ? {} : { players: next },
    });
  };

  return (
    <>
      <Hero
        spotlights={spotlights}
        playerCount={players ?? null}
        onPlayerCountChange={onPlayerCountChange}
      />
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
        {rails.length > 0 && allEmpty && (
          <Box sx={{ py: 10 }}>
            <Typography variant="h3" sx={{ fontStyle: 'italic', mb: 1 }}>
              Nothing for that many controllers.
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
              Most couch picks top out around 4 players. Try a smaller count, or
              browse the catalog.
            </Typography>
          </Box>
        )}
        {filteredRails.map((rail) => (
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
