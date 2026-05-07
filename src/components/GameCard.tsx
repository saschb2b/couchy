import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { CardActionAreaLink } from './RouterLinks';
import { ShortlistIconButton } from './ShortlistButton';
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

export function GameCard({ game, layout = 'rail' }: GameCardProps) {
  const reviewMeta: ReviewMeta | null =
    game.reviewClass !== null && game.reviewClass in REVIEW_LABEL
      ? (REVIEW_LABEL[game.reviewClass] ?? null)
      : null;
  const onSale = game.discountPercent > 0;

  return (
    <Box
      component="article"
      sx={{
        ...(layout === 'rail'
          ? { width: 256, flex: '0 0 auto' }
          : { width: '100%' }),
        position: 'relative',
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

        <Stack spacing={0.5} sx={{ pt: 1.5, px: 0.25 }}>
          <Typography
            className="game-card-title"
            sx={{
              fontWeight: 600,
              fontSize: 15,
              lineHeight: 1.25,
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
            spacing={1}
            sx={{ alignItems: 'center', minHeight: 22 }}
          >
            {reviewMeta !== null && (
              <Typography
                variant="caption"
                sx={{
                  color: reviewMeta.color,
                  fontWeight: 600,
                  fontSize: 11,
                  letterSpacing: '0.02em',
                }}
              >
                {reviewMeta.label.toUpperCase()}
              </Typography>
            )}
            {game.releasedAt !== null && (
              <>
                {reviewMeta !== null && (
                  <Box
                    sx={{
                      width: 2,
                      height: 2,
                      borderRadius: '50%',
                      backgroundColor: 'text.secondary',
                      opacity: 0.6,
                    }}
                  />
                )}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: 11 }}
                >
                  {game.releasedAt}
                </Typography>
              </>
            )}
            <Box sx={{ flex: 1 }} />
            <PriceLine game={game} />
          </Stack>
        </Stack>
      </CardActionAreaLink>
    </Box>
  );
}

const SALE_GREEN = '#a5db5f';

function PriceLine({ game }: { game: SteamGameSummary }) {
  if (game.finalPriceDisplay === null && game.finalPriceCents === null) {
    return null;
  }
  const final = game.finalPriceDisplay ?? formatCents(game.finalPriceCents);

  if (game.discountPercent > 0) {
    return (
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
        {game.originalPriceDisplay !== null && (
          <Typography
            sx={{
              color: 'text.secondary',
              textDecoration: 'line-through',
              fontSize: 11,
              opacity: 0.7,
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
          }}
        >
          {final}
        </Typography>
      </Stack>
    );
  }

  return (
    <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{final}</Typography>
  );
}

function formatCents(cents: number | null): string {
  if (cents === null) return '';
  if (cents === 0) return 'Free';
  return `$${(cents / 100).toFixed(2)}`;
}
