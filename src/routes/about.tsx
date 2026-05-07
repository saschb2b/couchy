import { createFileRoute } from '@tanstack/react-router';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Link from '@mui/material/Link';

export const Route = createFileRoute('/about')({
  component: AboutPage,
});

function AboutPage() {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Stack spacing={3}>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 800 }}>
          About Couchy
        </Typography>
        <Typography variant="body1">
          Couchy is a curated discovery page for couch / same-screen multiplayer games on Steam.
          When friends are over and someone asks "what should we play?", you shouldn't have to
          scroll the Steam store and YouTube reviews for an hour. Pick a vibe, browse a rail,
          click through to Steam.
        </Typography>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
          Where the data comes from
        </Typography>
        <Typography variant="body1">
          Game tiles, prices, and screenshots are pulled from the public Steam Store. Couchy filters
          on Steam's official "Shared/Split Screen" and "Shared/Split Screen Co-op/PvP" categories,
          so every game listed here genuinely supports same-screen play. Game details, prices, and
          art are &copy; their respective publishers.
        </Typography>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
          Not affiliated with Valve
        </Typography>
        <Typography variant="body1">
          Couchy is a fan project. Steam, Valve, and the Steam logo are trademarks of Valve Corp.
          When you click "Open on Steam", you go straight to the official store page.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Issues, suggestions, missing games?{' '}
          <Link href="https://github.com/" target="_blank" rel="noopener noreferrer">
            File a GitHub issue
          </Link>
          .
        </Typography>
      </Stack>
    </Container>
  );
}
