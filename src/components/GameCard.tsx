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
  /** `rail`: fixed 256px width for horizontal scrollers. `grid`: fills its grid cell. */
  layout?: 'rail' | 'grid';
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

  return (
    <Box
      component="article"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      sx={{
        ...(layout === 'rail'
          ? { width: 256, flex: '0 0 auto' }
          : { width: '100%' }),
        position: 'relative',
        // Mount-only fade-up. Cards keyed by appid don't re-mount on parent
        // re-renders, so this only fires for newly-arrived cards (e.g. the
        // page that "Show more" just appended).
        animation: 'gc-mount 360ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
        '@keyframes gc-mount': {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        // Hairline that brightens on hover.
        '&:hover .game-card-image-wrap': {
          transform: 'translateY(-3px)',
        },
        '&:hover .game-card-image-wrap::after': {
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
        <Box
          className="game-card-image-wrap"
          sx={{
            position: 'relative',
            aspectRatio: '460 / 215',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: onSale ? 'rgba(165, 219, 95, 0.4)' : 'divider',
            transition: 'transform 220ms ease',
            // Bottom highlight on hover.
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
            },
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
          Fixed three-row meta block. Every row has a deterministic height and
          everything is `nowrap` + ellipsis-truncated, so cards never resize
          based on which optional fields a particular game has. Without this,
          a long sale price + a long date string fights for room and the date
          wraps onto two or three lines, stretching the grid row.
        */}
        <Stack spacing={0.5} sx={{ pt: 1.5, px: 0.25 }}>
          <Typography
            className="game-card-title"
            sx={{
              fontWeight: 600,
              fontSize: 15,
              lineHeight: 1.25,
              height: '1.25em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              transition: 'color 160ms ease',
            }}
            title={game.name}
          >
            {game.name}
          </Typography>

          <Stack
            direction="row"
            spacing={0.75}
            sx={{
              alignItems: 'center',
              height: 16,
              overflow: 'hidden',
              minWidth: 0,
            }}
          >
            {reviewMeta !== null && (
              <Typography
                variant="caption"
                sx={{
                  color: reviewMeta.color,
                  fontWeight: 600,
                  fontSize: 11,
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                  flex: '0 0 auto',
                }}
              >
                {reviewMeta.label.toUpperCase()}
              </Typography>
            )}
            {reviewMeta !== null && game.releasedAt !== null && (
              <Box
                sx={{
                  width: 2,
                  height: 2,
                  borderRadius: '50%',
                  backgroundColor: 'text.secondary',
                  opacity: 0.6,
                  flex: '0 0 auto',
                }}
              />
            )}
            {game.releasedAt !== null && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  minWidth: 0,
                }}
              >
                {game.releasedAt}
              </Typography>
            )}
            {(() => {
              const chip = playerChip(game);
              if (chip === null) return null;
              return (
                <>
                  <Box
                    sx={{
                      width: 2,
                      height: 2,
                      borderRadius: '50%',
                      backgroundColor: 'text.secondary',
                      opacity: 0.6,
                      flex: '0 0 auto',
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'primary.main',
                      fontWeight: 700,
                      fontSize: 11,
                      letterSpacing: '0.02em',
                      whiteSpace: 'nowrap',
                      flex: '0 0 auto',
                    }}
                    title={chip.title}
                  >
                    {chip.label}
                  </Typography>
                </>
              );
            })()}
          </Stack>

          <Box sx={{ height: 20, display: 'flex', alignItems: 'center' }}>
            <PriceLine game={game} />
          </Box>
        </Stack>
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
        sx={{ alignItems: 'baseline', minWidth: 0, overflow: 'hidden' }}
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
    <Typography sx={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
      {final}
    </Typography>
  );
}

function formatCents(cents: number | null): string {
  if (cents === null) return '';
  if (cents === 0) return 'Free';
  return `$${(cents / 100).toFixed(2)}`;
}
