import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';
import { CardActionAreaLink } from './RouterLinks';
import { ShortlistIconButton } from './ShortlistButton';
import { TrailerPlayer } from './TrailerPlayer';
import type { SteamGameSummary } from '../server/steam/types';

interface GameCardProps {
  game: SteamGameSummary;
  /**
   * - `rail`: fixed 288 px wide for the standard horizontal scroller.
   * - `featured`: fixed 384 px wide for the discovery hero rail. Same meta
   *   block; the card is ~1.3× the standard width so the artwork carries
   *   the eye on first scroll.
   * - `grid`: fills its grid cell, used in `/browse` and `/shortlist`.
   */
  layout?: 'rail' | 'featured' | 'grid';
}

interface ReviewMeta {
  label: string;
  color: string;
}

const REVIEW_LABEL: Record<string, ReviewMeta> = {
  positive: { label: 'Positive', color: '#a5db5f' },
  mixed: { label: 'Mixed', color: '#c9a96e' },
  negative: { label: 'Negative', color: '#a34c25' },
};

const HOVER_PLAY_DELAY_MS = 450;

export function GameCard({ game, layout = 'rail' }: GameCardProps) {
  const reviewMeta: ReviewMeta | null =
    game.reviewClass !== null && game.reviewClass in REVIEW_LABEL
      ? (REVIEW_LABEL[game.reviewClass] ?? null)
      : null;
  const onSale = game.discountPercent > 0;
  const [showTrailer, setShowTrailer] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimer.current !== null) clearTimeout(hoverTimer.current);
    };
  }, []);

  const onPointerEnter = () => {
    if (game.trailerHls === null) return;
    if (hoverTimer.current !== null) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      setShowTrailer(true);
    }, HOVER_PLAY_DELAY_MS);
  };
  const onPointerLeave = () => {
    if (hoverTimer.current !== null) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setShowTrailer(false);
  };

  const chip = playerChip(game);
  const railWidth = layout === 'featured' ? 384 : 288;

  return (
    <Box
      component="article"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      sx={{
        ...(layout === 'grid'
          ? { width: '100%' }
          : { width: railWidth, flex: '0 0 auto' }),
        position: 'relative',
        // Mount-only fade-up. Cards keyed by appid don't re-mount on parent
        // re-renders, so this only fires for newly-arrived cards (e.g. the
        // page that "Show more" just appended).
        animation: 'gc-mount 360ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
        '@keyframes gc-mount': {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        // The frame lifts and brightens as a single object on hover.
        '&:hover .game-card-frame': {
          transform: 'translateY(-3px)',
          borderColor: 'primary.main',
        },
        '&:hover .game-card-frame::after': {
          opacity: 1,
        },
        '&:hover .game-card-title': {
          color: 'primary.main',
        },
        '&:hover .shortlist-icon-wrap': {
          opacity: 1,
        },
      }}
    >
      <ShortlistIconButton
        appid={game.appid}
        name={game.name}
        capsuleImage={game.capsuleImage}
      />
      <CardActionAreaLink
        to="/game/$appid"
        params={{ appid: String(game.appid) }}
        sx={{
          display: 'block',
          color: 'inherit',
          textAlign: 'left',
        }}
      >
        {/*
          The card is one object: a single bordered frame enclosing the
          artwork on top and a `background.paper` meta plinth below. The
          plinth is what makes the card read as a contained unit rather
          than a loose image with caption text trailing underneath.
        */}
        <Box
          className="game-card-frame"
          sx={{
            position: 'relative',
            border: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
            transition: 'transform 220ms ease, border-color 220ms ease',
            // Bottom highlight on hover: a 2 px amber rule that fades in
            // along the bottom of the whole card.
            '&::after': {
              content: '""',
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 2,
              background: 'var(--mui-palette-primary-main)',
              opacity: 0,
              transition: 'opacity 220ms ease',
              zIndex: 3,
            },
          }}
        >
          <Box
            sx={{
              position: 'relative',
              aspectRatio: '460 / 215',
              overflow: 'hidden',
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            {game.capsuleImage !== null && (
              <Box
                component="img"
                src={game.capsuleImage}
                alt={game.name}
                loading="lazy"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            )}
            {showTrailer && game.trailerHls !== null && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  animation: 'card-trailer-fade 320ms ease forwards',
                  '@keyframes card-trailer-fade': {
                    from: { opacity: 0 },
                    to: { opacity: 1 },
                  },
                }}
              >
                <TrailerPlayer
                  src={game.trailerHls}
                  controls={false}
                  loop
                  muted
                  autoPlay
                />
              </Box>
            )}
            {onSale && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  px: 1,
                  py: 0.25,
                  backgroundColor: '#1f3308',
                  color: '#a5db5f',
                  fontFamily: 'h1.fontFamily',
                  fontStyle: 'italic',
                  fontWeight: 600,
                  fontSize: 13,
                  letterSpacing: '-0.01em',
                }}
              >
                −{game.discountPercent}%
              </Box>
            )}
          </Box>

          {/*
            Two-row meta plinth inside the card frame.
            Row 1: title + player-count chip on the right.
            Row 2: review label (when present) + price line on the right.
            Fixed heights so optional fields don't jitter the grid.
          */}
          <Stack spacing={0.5} sx={{ px: 1.5, py: 1.25 }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: 'center',
                justifyContent: 'space-between',
                minWidth: 0,
                height: '1.3em',
              }}
            >
              <Typography
                className="game-card-title"
                sx={{
                  fontWeight: 700,
                  fontSize: layout === 'featured' ? 16 : 15,
                  lineHeight: 1.3,
                  letterSpacing: '-0.005em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                  flex: '1 1 auto',
                  transition: 'color 160ms ease',
                }}
                title={
                  game.releasedAt !== null
                    ? `${game.name} · ${game.releasedAt}`
                    : game.name
                }
              >
                {game.name}
              </Typography>
              {chip !== null && (
                <Typography
                  title={chip.title}
                  sx={{
                    fontFamily: 'h1.fontFamily',
                    fontStyle: 'italic',
                    color: 'primary.main',
                    fontWeight: 700,
                    fontSize: 13,
                    letterSpacing: '0.01em',
                    whiteSpace: 'nowrap',
                    flex: '0 0 auto',
                    lineHeight: 1,
                  }}
                >
                  {chip.label}
                </Typography>
              )}
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: 'baseline',
                justifyContent: 'space-between',
                height: 18,
                minWidth: 0,
                overflow: 'hidden',
              }}
            >
              {reviewMeta !== null ? (
                <Typography
                  variant="caption"
                  sx={{
                    color: reviewMeta.color,
                    fontWeight: 600,
                    fontSize: 11,
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                    flex: '0 0 auto',
                  }}
                >
                  {reviewMeta.label.toUpperCase()}
                </Typography>
              ) : (
                <Box sx={{ flex: '0 0 auto', width: 0 }} />
              )}
              <PriceLine game={game} />
            </Stack>
          </Stack>
        </Box>
      </CardActionAreaLink>
    </Box>
  );
}

/**
 * Pick the local-player chip for the card. PCGW data takes precedence when
 * present (structured min/max, mode list); falls back to the description-
 * parsed `maxPlayers`. Returns `null` when neither source has a count.
 */
function playerChip(game: SteamGameSummary): { label: string; title: string } | null {
  const lp = game.localPlayers;
  if (lp !== null) {
    const label = lp.min === lp.max ? `${String(lp.max)}P` : `${String(lp.min)}-${String(lp.max)}P`;
    const range =
      lp.min === lp.max
        ? `${String(lp.max)} local`
        : `${String(lp.min)}-${String(lp.max)} local`;
    const modes = lp.modes.length > 0 ? `, ${lp.modes.join(' & ').toLowerCase()}` : '';
    return { label, title: `${range}${modes}` };
  }
  if (game.maxPlayers !== null) {
    return {
      label: `${String(game.maxPlayers)}P`,
      title: `Up to ${String(game.maxPlayers)} players`,
    };
  }
  return null;
}

const SALE_GREEN = '#a5db5f';

function PriceLine({ game }: { game: SteamGameSummary }) {
  if (game.finalPriceDisplay === null && game.finalPriceCents === null) {
    return null;
  }
  const final = game.finalPriceDisplay ?? formatCents(game.finalPriceCents);

  if (game.discountPercent > 0) {
    return (
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'baseline', minWidth: 0, overflow: 'hidden', flex: '0 0 auto' }}
      >
        {game.originalPriceDisplay !== null && (
          <Typography
            sx={{
              color: 'text.secondary',
              textDecoration: 'line-through',
              fontSize: 11,
              opacity: 0.7,
              whiteSpace: 'nowrap',
              flex: '0 0 auto',
            }}
          >
            {game.originalPriceDisplay}
          </Typography>
        )}
        <Typography
          sx={{
            color: SALE_GREEN,
            fontWeight: 700,
            fontSize: 13,
            whiteSpace: 'nowrap',
            flex: '0 0 auto',
          }}
        >
          {final}
        </Typography>
      </Stack>
    );
  }

  return (
    <Typography
      sx={{
        fontWeight: 600,
        fontSize: 13,
        whiteSpace: 'nowrap',
        flex: '0 0 auto',
      }}
    >
      {final}
    </Typography>
  );
}

function formatCents(cents: number | null): string {
  if (cents === null) return '';
  if (cents === 0) return 'Free';
  return `$${(cents / 100).toFixed(2)}`;
}
