import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { CardActionAreaLink } from './RouterLinks';
import type { SteamGameSummary } from '../server/steam/types';

interface GameCardProps {
  game: SteamGameSummary;
}

interface ReviewMeta {
  label: string;
  color: string;
}

const REVIEW_LABEL: Record<string, ReviewMeta> = {
  positive: { label: 'Positive', color: '#66c0f4' },
  mixed: { label: 'Mixed', color: '#b9a074' },
  negative: { label: 'Negative', color: '#a34c25' },
};

export function GameCard({ game }: GameCardProps) {
  const reviewMeta: ReviewMeta | null =
    game.reviewClass !== null && game.reviewClass in REVIEW_LABEL
      ? (REVIEW_LABEL[game.reviewClass] ?? null)
      : null;
  const onSale = game.discountPercent > 0;

  return (
    <Card
      sx={{
        width: 232,
        flex: '0 0 auto',
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 100%)',
        border: '1px solid',
        borderColor: onSale ? 'rgba(165, 219, 95, 0.45)' : 'divider',
        transition: 'transform 160ms ease, border-color 160ms ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          borderColor: onSale ? 'rgb(165, 219, 95)' : 'primary.main',
        },
      }}
    >
      <CardActionAreaLink to="/game/$appid" params={{ appid: String(game.appid) }}>
        {game.capsuleImage !== null && (
          <CardMedia
            component="img"
            image={game.capsuleImage}
            alt={game.name}
            sx={{ aspectRatio: '460 / 215', objectFit: 'cover' }}
          />
        )}
        <CardContent sx={{ pb: 1.5 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={game.name}
          >
            {game.name}
          </Typography>
          {game.releasedAt !== null && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {game.releasedAt}
            </Typography>
          )}
          <Stack direction="row" spacing={1} sx={{ mt: 1, minHeight: 28, alignItems: 'center' }}>
            {reviewMeta !== null && (
              <Chip
                size="small"
                label={reviewMeta.label}
                sx={{
                  backgroundColor: `${reviewMeta.color}24`,
                  color: reviewMeta.color,
                  border: `1px solid ${reviewMeta.color}66`,
                }}
              />
            )}
            <Box sx={{ flex: 1 }} />
            <PriceBlock game={game} />
          </Stack>
        </CardContent>
      </CardActionAreaLink>
    </Card>
  );
}

const SALE_GREEN = 'rgb(165, 219, 95)';
const SALE_BG = 'rgba(76, 105, 25, 0.6)';
const SALE_PCT_BG = 'rgb(76, 105, 25)';

function PriceBlock({ game }: { game: SteamGameSummary }) {
  if (game.finalPriceDisplay === null && game.finalPriceCents === null) {
    return null;
  }
  const final = game.finalPriceDisplay ?? formatCents(game.finalPriceCents);

  if (game.discountPercent > 0) {
    return (
      <Stack
        direction="row"
        spacing={0}
        sx={{
          alignItems: 'stretch',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            px: 0.75,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: SALE_PCT_BG,
            color: SALE_GREEN,
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: '0.02em',
          }}
        >
          {`-${String(game.discountPercent)}%`}
        </Box>
        <Stack
          spacing={0}
          sx={{
            px: 0.75,
            py: 0.25,
            backgroundColor: SALE_BG,
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
        >
          {game.originalPriceDisplay !== null && (
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255, 255, 255, 0.55)',
                textDecoration: 'line-through',
                lineHeight: 1.1,
                fontSize: 11,
              }}
            >
              {game.originalPriceDisplay}
            </Typography>
          )}
          <Typography
            variant="body2"
            sx={{
              color: SALE_GREEN,
              fontWeight: 700,
              lineHeight: 1.1,
            }}
          >
            {final}
          </Typography>
        </Stack>
      </Stack>
    );
  }

  return (
    <Typography variant="body2" sx={{ fontWeight: 700 }}>
      {final}
    </Typography>
  );
}

function formatCents(cents: number | null): string {
  if (cents === null) return '';
  if (cents === 0) return 'Free';
  return `$${(cents / 100).toFixed(2)}`;
}
