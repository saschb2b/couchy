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
}

export function GameRail({ title, subtitle, games, steamSearchUrl }: GameRailProps) {
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
    <Box sx={{ mb: 6 }}>
      <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'flex-end' }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          {subtitle !== undefined && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
          <IconButton
            size="small"
            onClick={() => {
              scroll(-1);
            }}
            aria-label="Scroll left"
          >
            <ChevronLeftIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              scroll(1);
            }}
            aria-label="Scroll right"
          >
            <ChevronRightIcon />
          </IconButton>
        </Stack>
        {steamSearchUrl !== undefined && (
          <Button
            size="small"
            variant="text"
            href={steamSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewIcon />}
          >
            See all on Steam
          </Button>
        )}
      </Stack>
      <Box
        ref={scrollerRef}
        sx={{
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          pb: 2,
          scrollSnapType: 'x mandatory',
          '& > *': { scrollSnapAlign: 'start' },
          '&::-webkit-scrollbar': { height: 8 },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderRadius: 4,
          },
        }}
      >
        {games.map((game) => (
          <GameCard key={game.appid} game={game} />
        ))}
      </Box>
    </Box>
  );
}
