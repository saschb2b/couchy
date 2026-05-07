import { createFileRoute, notFound } from '@tanstack/react-router';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import GroupsIcon from '@mui/icons-material/Groups';
import { fetchAppDetails } from '../server/fns';
import type { SteamAppDetails } from '../server/steam/types';

export const Route = createFileRoute('/game/$appid')({
  loader: async ({ params }) => {
    const data = await fetchAppDetails({ data: { appid: params.appid } });
    if (data === null) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack uses a plain object marker, not an Error subclass
      throw notFound();
    }
    return { data };
  },
  staleTime: 24 * 60 * 60 * 1000,
  component: GameDetailPage,
});

const COUCH_CATEGORY_IDS = new Set<number>([24, 39, 40, 47, 48]);

function GameDetailPage() {
  const { data } = Route.useLoaderData();
  const couchCategories =
    data.categories?.filter((c: { id: number; description: string }) =>
      COUCH_CATEGORY_IDS.has(c.id),
    ) ?? [];
  const headerImage = data.header_image;
  const screenshot = data.screenshots?.[0]?.path_full ?? null;
  const heroImage = screenshot ?? headerImage;
  const storeUrl = `https://store.steampowered.com/app/${String(data.steam_appid)}/`;

  return (
    <>
      <Box
        sx={{
          minHeight: { xs: 280, md: 460 },
          display: 'flex',
          alignItems: 'flex-end',
          backgroundImage: `linear-gradient(180deg, rgba(16,19,26,0.4) 0%, rgba(16,19,26,0.95) 100%), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Stack spacing={2} sx={{ maxWidth: 820 }}>
            {couchCategories.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
                {couchCategories.map((c: { id: number; description: string }) => (
                  <Chip
                    key={c.id}
                    icon={<GroupsIcon />}
                    label={c.description}
                    sx={{
                      backgroundColor: 'primary.main',
                      color: '#10131a',
                      fontWeight: 700,
                    }}
                  />
                ))}
              </Stack>
            )}
            <Typography variant="h2" component="h1" sx={{ lineHeight: 1.05 }}>
              {data.name}
            </Typography>
            {data.developers !== undefined && data.developers.length > 0 && (
              <Typography variant="body1" color="text.secondary">
                by {data.developers.join(', ')}
              </Typography>
            )}
          </Stack>
        </Container>
      </Box>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box
          sx={{
            display: 'grid',
            gap: 4,
            gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
              About this game
            </Typography>
            <Typography variant="body1" sx={{ mb: 4 }}>
              {data.short_description}
            </Typography>

            {data.screenshots !== undefined && data.screenshots.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Screenshots
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    overflowX: 'auto',
                    pb: 2,
                    '& img': {
                      flex: '0 0 auto',
                      width: { xs: 280, sm: 380 },
                      borderRadius: 2,
                      objectFit: 'cover',
                    },
                  }}
                >
                  {data.screenshots
                    .slice(0, 8)
                    .map((s: { id: number; path_thumbnail: string; path_full: string }) => (
                      <img
                        key={s.id}
                        src={s.path_thumbnail}
                        alt={`${data.name} screenshot`}
                      />
                    ))}
                </Box>
              </Box>
            )}

            <CategoriesAndGenres data={data} />
          </Box>

          <Box>
            <Stack
              spacing={2}
              sx={{
                p: 3,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'background.paper',
                position: 'sticky',
                top: 80,
              }}
            >
              {data.price_overview !== undefined ? (
                <Stack spacing={1}>
                  {data.price_overview.discount_percent > 0 && (
                    <Chip
                      color="success"
                      label={`-${String(data.price_overview.discount_percent)}% on Steam`}
                      sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
                    />
                  )}
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    {data.price_overview.final_formatted}
                  </Typography>
                  {data.price_overview.discount_percent > 0 && (
                    <Typography
                      variant="body2"
                      sx={{ textDecoration: 'line-through', color: 'text.secondary' }}
                    >
                      {data.price_overview.initial_formatted}
                    </Typography>
                  )}
                </Stack>
              ) : data.is_free ? (
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  Free to play
                </Typography>
              ) : null}
              <Button
                variant="contained"
                size="large"
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<OpenInNewIcon />}
              >
                Open on Steam
              </Button>
              {data.metacritic !== undefined && (
                <Typography variant="body2" color="text.secondary">
                  Metacritic: <b>{data.metacritic.score}</b>
                </Typography>
              )}
              {data.recommendations !== undefined && (
                <Typography variant="body2" color="text.secondary">
                  {data.recommendations.total.toLocaleString()} Steam recommendations
                </Typography>
              )}
              {data.platforms !== undefined && (
                <Typography variant="body2" color="text.secondary">
                  Platforms:{' '}
                  {[
                    data.platforms.windows ? 'Windows' : null,
                    data.platforms.mac ? 'macOS' : null,
                    data.platforms.linux ? 'Linux' : null,
                  ]
                    .filter((p): p is string => p !== null)
                    .join(', ')}
                </Typography>
              )}
            </Stack>
          </Box>
        </Box>
      </Container>
    </>
  );
}

function CategoriesAndGenres({ data }: { data: SteamAppDetails }) {
  return (
    <Box>
      {data.genres !== undefined && data.genres.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="overline" color="text.secondary">
            Genres
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
            {data.genres.map((g) => (
              <Chip key={g.id} label={g.description} variant="outlined" size="small" />
            ))}
          </Stack>
        </Box>
      )}
      {data.categories !== undefined && data.categories.length > 0 && (
        <Box>
          <Typography variant="overline" color="text.secondary">
            Features
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
            {data.categories.map((c) => (
              <Chip key={c.id} label={c.description} variant="outlined" size="small" />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
