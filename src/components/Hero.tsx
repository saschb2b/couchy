import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { ButtonLink } from './RouterLinks';
import type { SteamGameSummary } from '../server/steam/types';

interface HeroProps {
  /** Game we're spotlighting, drawn from the top-sellers rail. */
  spotlight: SteamGameSummary | null;
}

/**
 * Steam keeps a wide library_hero image (~1920×620) per app at a predictable URL.
 * Falls back to the small capsule when missing — far rarer for top sellers.
 */
function libraryHeroUrl(appid: number): string {
  return `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${String(appid)}/library_hero.jpg`;
}

export function Hero({ spotlight }: HeroProps) {
  const heroImage =
    spotlight !== null ? libraryHeroUrl(spotlight.appid) : null;
  const fallbackImage = spotlight?.capsuleImage ?? null;

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: { xs: 520, md: 640 },
        display: 'flex',
        alignItems: 'flex-end',
        mb: { xs: 8, md: 12 },
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Background layers: image, blurred capsule fallback, gradient mask, vignette.
          We use a plain inline style for the dynamic URL so it's present in the SSR
          payload — Emotion only flushes styles after client hydration. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          ...(heroImage === null && {
            filter: 'blur(40px) saturate(1.2)',
            transform: 'scale(1.2)',
          }),
        }}
        style={{
          backgroundImage:
            heroImage !== null
              ? `url(${heroImage})`
              : fallbackImage !== null
                ? `url(${fallbackImage})`
                : undefined,
        }}
      />
      <Box
        aria-hidden
        sx={{ position: 'absolute', inset: 0 }}
        style={{
          background:
            'linear-gradient(180deg, rgba(14, 12, 10, 0.35) 0%, rgba(14, 12, 10, 0.55) 40%, rgba(14, 12, 10, 0.95) 100%), radial-gradient(ellipse 80% 60% at 30% 100%, rgba(255, 209, 102, 0.18) 0%, transparent 60%)',
        }}
      />

      <Container maxWidth="xl" sx={{ position: 'relative', py: { xs: 6, md: 10 } }}>
        <Stack spacing={{ xs: 3, md: 4 }} sx={{ maxWidth: 880 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 36,
                height: 1,
                background: 'primary.main',
                backgroundColor: 'primary.main',
              }}
            />
            <Typography
              variant="overline"
              sx={{
                color: 'primary.main',
                fontWeight: 700,
              }}
            >
              Tonight on Steam
            </Typography>
          </Stack>

          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontSize: { xs: 56, sm: 84, md: 124 },
              maxWidth: { xs: '100%', md: '11ch' },
              // Slight italic stress on "we"-style words via Fraunces optical size.
              fontVariationSettings: '"opsz" 144',
            }}
          >
            What should{' '}
            <Box component="em" sx={{ color: 'primary.main', fontStyle: 'italic' }}>
              we
            </Box>{' '}
            play tonight?
          </Typography>

          <Typography
            variant="h6"
            color="text.secondary"
            sx={{
              fontFamily: 'h1.fontFamily',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: { xs: 18, md: 22 },
              maxWidth: 620,
              lineHeight: 1.4,
            }}
          >
            Games worth firing up when friends are over and the controllers
            are already on the table.
          </Typography>

          {spotlight !== null && (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{
                pt: { xs: 1, md: 3 },
                alignItems: { sm: 'center' },
              }}
            >
              <ButtonLink
                to="/game/$appid"
                params={{ appid: String(spotlight.appid) }}
                variant="contained"
                size="large"
              >
                Start with {spotlight.name}
              </ButtonLink>
              <ButtonLink
                to="/browse"
                search={{
                  mood: 'all',
                  sort: 'topsellers',
                  specials: false,
                  pageCount: 1,
                }}
                variant="outlined"
                size="large"
              >
                Browse the catalog
              </ButtonLink>
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
