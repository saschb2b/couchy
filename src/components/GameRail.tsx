import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useRef } from 'react';
import { GameCard } from './GameCard';
import type { SteamGameSummary } from '../server/steam/types';

interface GameRailProps {
  title: string;
  subtitle?: string;
  games: SteamGameSummary[];
  steamSearchUrl?: string;
  /**
   * Render cards at the featured (384 px wide) size instead of the standard
   * 256 px. Reserved for the first rail on `/`: it's the discovery hero rail,
   * larger artwork carrying the eye on first scroll. Don't apply to more
   * than one rail on the page — the size hierarchy is the signal.
   */
  featured?: boolean;
}

export function GameRail({ title, subtitle, games, steamSearchUrl, featured = false }: GameRailProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const scroll = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (el === null) return;
    const amount = el.clientWidth * 0.85 * dir;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  if (games.length === 0) {
    return null;
  }

  return (
    <Box
      component="section"
      sx={{
        mb: { xs: 6, md: 9 },
        position: 'relative',
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 1.5, md: 4 }}
        sx={{ mb: 3, alignItems: { md: 'flex-end' } }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="h3"
            component="h2"
            sx={{
              mb: 0.5,
              fontSize: { xs: 30, md: 42 },
            }}
          >
            {title}
          </Typography>
          {subtitle !== undefined && (
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                maxWidth: 520,
                fontStyle: 'italic',
                fontFamily: 'h1.fontFamily',
                fontWeight: 400,
                fontSize: { xs: 16, md: 18 },
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flex: '0 0 auto' }}>
          <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
            <IconButton
              size="small"
              onClick={() => {
                scroll(-1);
              }}
              aria-label="Scroll left"
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
              }}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => {
                scroll(1);
              }}
              aria-label="Scroll right"
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
              }}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Stack>
          {steamSearchUrl !== undefined && (
            <Button
              size="small"
              variant="outlined"
              href={steamSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNewIcon sx={{ fontSize: 11, opacity: 0.7 }} />}
              sx={{
                color: 'text.secondary',
                borderColor: 'divider',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                py: 0.5,
                px: 1.5,
                minWidth: 0,
                lineHeight: 1.2,
                '&:hover': {
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  backgroundColor: 'rgba(255, 209, 102, 0.04)',
                },
              }}
            >
              BROWSE ALL
            </Button>
          )}
        </Stack>
      </Stack>

      <Box
        ref={scrollerRef}
        sx={{
          display: 'flex',
          gap: 2.5,
          overflowX: 'auto',
          pb: 2,
          // Bleed past the container edge for a cinematic effect.
          mx: { xs: -2, md: 0 },
          px: { xs: 2, md: 0 },
          scrollSnapType: 'x mandatory',
          '& > *': { scrollSnapAlign: 'start' },
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(245, 237, 224, 0.18) transparent',
          '&::-webkit-scrollbar': { height: 6 },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(245, 237, 224, 0.18)',
            borderRadius: 3,
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: 'rgba(255, 209, 102, 0.4)',
          },
        }}
      >
        {games.map((game) => (
          <GameCard key={game.appid} game={game} layout={featured ? 'featured' : 'rail'} />
        ))}
      </Box>
    </Box>
  );
}
