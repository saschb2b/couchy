import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import GroupsIcon from '@mui/icons-material/Groups';
import LocalPizzaIcon from '@mui/icons-material/LocalPizza';
import { ButtonLink } from './RouterLinks';
import type { SteamGameSummary } from '../server/steam/types';

interface HeroProps {
  /** Game to spotlight; we pull a fresh top-seller server-side. */
  spotlight: SteamGameSummary | null;
}

export function Hero({ spotlight }: HeroProps) {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: { xs: 360, md: 480 },
        mb: 6,
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'background.paper',
        backgroundImage:
          spotlight?.capsuleImage !== undefined && spotlight.capsuleImage !== null
            ? `linear-gradient(180deg, rgba(16,19,26,0.55) 0%, rgba(16,19,26,0.95) 90%), url(${spotlight.capsuleImage})`
            : 'linear-gradient(135deg, rgba(255,122,89,0.15) 0%, rgba(122,214,255,0.10) 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Container maxWidth="xl" sx={{ position: 'relative', py: { xs: 6, md: 10 } }}>
        <Stack spacing={3} sx={{ maxWidth: 720 }}>
          <Stack direction="row" spacing={1}>
            <Chip
              icon={<GroupsIcon />}
              label="Same screen, same room"
              variant="outlined"
              sx={{ borderColor: 'primary.main', color: 'primary.main' }}
            />
            <Chip
              icon={<LocalPizzaIcon />}
              label="Pizza & controllers ready"
              variant="outlined"
            />
          </Stack>
          <Typography variant="h2" component="h1" sx={{ lineHeight: 1.05 }}>
            What should we play tonight?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
            Curated couch co-op &amp; same-screen versus picks from the Steam store —
            so you stop scrolling reviews and start playing.
          </Typography>
          {spotlight !== null && (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{
                pt: 2,
                alignItems: { xs: 'flex-start', sm: 'center' },
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Tonight's spotlight:
              </Typography>
              <ButtonLink
                to="/game/$appid"
                params={{ appid: String(spotlight.appid) }}
                variant="contained"
                size="large"
              >
                {spotlight.name}
              </ButtonLink>
              <ButtonLink
                to="/browse"
                search={{ mood: 'all', sort: 'topsellers', specials: false, pageCount: 1 }}
                variant="outlined"
                size="large"
              >
                Browse all couch picks
              </ButtonLink>
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
