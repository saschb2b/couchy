import { createFileRoute } from '@tanstack/react-router';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';

export const Route = createFileRoute('/about')({
  component: AboutPage,
});

function AboutPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 8, md: 14 } }}>
      <Stack spacing={2} sx={{ mb: { xs: 5, md: 8 } }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Box sx={{ width: 36, height: 1, backgroundColor: 'primary.main' }} />
          <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700 }}>
            Colophon
          </Typography>
        </Stack>
        <Typography
          variant="h1"
          component="h1"
          sx={{ fontSize: { xs: 56, md: 96 }, lineHeight: 0.95 }}
        >
          About{' '}
          <Box component="em" sx={{ color: 'primary.main', fontStyle: 'italic' }}>
            Couchy
          </Box>
          .
        </Typography>
      </Stack>

      <Stack spacing={5}>
        <Section
          eyebrow="The premise"
          body="Couchy is a small, opinionated guide to playing video games with the people in your living room. When friends are over and someone asks 'what should we play?' — you shouldn't have to scroll the Steam store and YouTube reviews for an hour. Pick a vibe, browse a rail, click through to Steam."
        />
        <Section
          eyebrow="What you're seeing"
          body="Game art, prices, screenshots, and review summaries are pulled live from Steam's storefront. Couchy filters strictly on Steam's official Shared/Split Screen, Co-op, and PvP categories so every game listed here is genuinely playable on one couch with one screen."
        />
        <Section
          eyebrow="Not affiliated"
          body="Couchy is a fan project. Steam, Valve, and the Steam logo are trademarks of Valve Corp. Game artwork and metadata are © their respective publishers. Clicking 'Open on Steam' takes you straight to the official store page — we don't sell anything ourselves."
        />
        <Box>
          <Typography
            variant="overline"
            sx={{ color: 'text.secondary', display: 'block', mb: 1 }}
          >
            Reach
          </Typography>
          <Typography
            sx={{
              fontFamily: 'h1.fontFamily',
              fontStyle: 'italic',
              fontSize: { xs: 18, md: 22 },
              maxWidth: 520,
            }}
          >
            Found a game we missed, or one we shouldn&apos;t list?{' '}
            <Link
              href="https://github.com/"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'primary.main',
                textDecorationColor: 'primary.main',
                textUnderlineOffset: 4,
              }}
            >
              File an issue on GitHub
            </Link>
            .
          </Typography>
        </Box>
      </Stack>
    </Container>
  );
}

function Section({ eyebrow, body }: { eyebrow: string; body: string }) {
  return (
    <Box>
      <Typography
        variant="overline"
        sx={{ color: 'text.secondary', display: 'block', mb: 1 }}
      >
        {eyebrow}
      </Typography>
      <Typography
        sx={{
          fontFamily: 'h1.fontFamily',
          fontWeight: 400,
          fontSize: { xs: 19, md: 22 },
          lineHeight: 1.45,
          letterSpacing: '-0.005em',
          maxWidth: 680,
        }}
      >
        {body}
      </Typography>
    </Box>
  );
}
