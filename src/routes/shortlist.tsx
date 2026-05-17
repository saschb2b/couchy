import { createFileRoute } from '@tanstack/react-router';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { useShortlist } from '../lib/useShortlist';
import { removeFromShortlist } from '../lib/shortlist';
import type { ShortlistItem } from '../lib/shortlist';
import { CardActionAreaLink } from '../components/RouterLinks';
import { ButtonLink } from '../components/RouterLinks';
import { buildSeoMeta, canonicalLink } from '../seo';

export const Route = createFileRoute('/shortlist')({
  head: () => ({
    meta: [
      ...buildSeoMeta({
        title: 'Shortlist · Couchy',
        description:
          'Games saved for your next couch night. Stored on this device only.',
        path: '/shortlist',
      }),
      // localStorage-only data — don't index empty SSR snapshots.
      { name: 'robots', content: 'noindex, follow' },
    ],
    links: [canonicalLink('/shortlist')],
  }),
  // SSR returns an empty list (localStorage is client-only). The hook fills in
  // after hydration via useSyncExternalStore.
  ssr: false,
  component: ShortlistPage,
});

function ShortlistPage() {
  const items = useShortlist();
  return (
    <Container maxWidth="xl" sx={{ py: { xs: 5, md: 9 } }}>
      <Stack spacing={2} sx={{ mb: { xs: 5, md: 8 }, maxWidth: 920 }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{
            alignItems: 'center',
            // Hidden on xs: the active Saved nav icon + the H1 already
            // identify this page. Eyebrow earns its place on desktop.
            display: { xs: 'none', sm: 'flex' },
          }}
        >
          <Box sx={{ width: 36, height: 1, backgroundColor: 'primary.main' }} />
          <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700 }}>
            Your shortlist
          </Typography>
        </Stack>
        <Typography
          variant="h1"
          component="h1"
          sx={{ fontSize: { xs: 48, md: 84 }, lineHeight: 0.95 }}
        >
          Saved for couch night.
        </Typography>
        <Typography
          color="text.secondary"
          sx={{
            fontFamily: 'h1.fontFamily',
            fontStyle: 'italic',
            fontSize: { xs: 17, md: 19 },
            maxWidth: 600,
            lineHeight: 1.45,
          }}
        >
          Stored on this device. Nothing leaves your browser.
        </Typography>
      </Stack>

      {items.length === 0 ? <EmptyState /> : <ShortlistGrid items={items} />}
    </Container>
  );
}

function ShortlistGrid({ items }: { items: ShortlistItem[] }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: { xs: 2, md: 3 },
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          sm: 'repeat(3, minmax(0, 1fr))',
          md: 'repeat(4, minmax(0, 1fr))',
          lg: 'repeat(5, minmax(0, 1fr))',
        },
      }}
    >
      {items.map((item) => (
        <ShortlistCard key={item.appid} item={item} />
      ))}
    </Box>
  );
}

function ShortlistCard({ item }: { item: ShortlistItem }) {
  return (
    <Box
      sx={{
        position: 'relative',
        '&:hover .shortlist-remove': { opacity: 1 },
        '&:hover .shortlist-card-frame': {
          transform: 'translateY(-3px)',
          borderColor: 'primary.main',
        },
        '&:hover .shortlist-card-frame::after': { opacity: 1 },
        '&:hover .shortlist-card-title': { color: 'primary.main' },
      }}
    >
      <IconButton
        className="shortlist-remove"
        size="small"
        aria-label={`Remove ${item.name} from shortlist`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          removeFromShortlist(item.appid);
        }}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 3,
          width: 32,
          height: 32,
          color: 'common.white',
          backgroundColor: 'rgba(8, 6, 5, 0.65)',
          backdropFilter: 'blur(6px)',
          opacity: 0,
          transition: 'opacity 200ms ease',
          '&:hover': {
            backgroundColor: 'rgba(8, 6, 5, 0.85)',
            color: 'secondary.main',
          },
        }}
      >
        <CloseIcon sx={{ fontSize: 18 }} />
      </IconButton>
      <CardActionAreaLink
        to="/game/$appid"
        params={{ appid: String(item.appid) }}
        sx={{ display: 'block', color: 'inherit', textAlign: 'left' }}
      >
        <Box
          className="shortlist-card-frame"
          sx={{
            position: 'relative',
            border: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
            transition: 'transform 220ms ease, border-color 220ms ease',
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
              zIndex: 2,
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
            {item.capsuleImage !== null && (
              <Box
                component="img"
                src={item.capsuleImage}
                alt={item.name}
                loading="lazy"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            )}
          </Box>
          <Box sx={{ px: 1.5, py: 1.25 }}>
            <Typography
              className="shortlist-card-title"
              sx={{
                fontWeight: 700,
                fontSize: 15,
                lineHeight: 1.3,
                letterSpacing: '-0.005em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                transition: 'color 160ms ease',
              }}
              title={item.name}
            >
              {item.name}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: 11, mt: 0.25, display: 'block' }}
            >
              Added {formatRelative(item.addedAt)}
            </Typography>
          </Box>
        </Box>
      </CardActionAreaLink>
    </Box>
  );
}

function EmptyState() {
  return (
    <Box sx={{ py: { xs: 8, md: 14 }, maxWidth: 640 }}>
      <Typography
        variant="h3"
        sx={{
          fontStyle: 'italic',
          fontSize: { xs: 32, md: 44 },
          mb: 2,
        }}
      >
        Nothing saved yet.
      </Typography>
      <Typography
        color="text.secondary"
        sx={{
          fontFamily: 'h1.fontFamily',
          fontStyle: 'italic',
          fontSize: { xs: 17, md: 19 },
          mb: 4,
          lineHeight: 1.45,
        }}
      >
        Hover any game card and tap the bookmark icon, or open a game and hit
        Save to shortlist. Picks live in this browser only.
      </Typography>
      <ButtonLink to="/" search={{}} variant="contained" size="large">
        Browse the picks
      </ButtonLink>
    </Box>
  );
}

const RTF = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function formatRelative(timestamp: number): string {
  const diffMs = timestamp - Date.now();
  const diffMin = diffMs / 60_000;
  const diffHr = diffMin / 60;
  const diffDay = diffHr / 24;
  if (Math.abs(diffMin) < 1) return 'just now';
  if (Math.abs(diffMin) < 60) return RTF.format(Math.round(diffMin), 'minute');
  if (Math.abs(diffHr) < 24) return RTF.format(Math.round(diffHr), 'hour');
  return RTF.format(Math.round(diffDay), 'day');
}
