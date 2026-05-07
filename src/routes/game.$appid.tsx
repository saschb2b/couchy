import { createFileRoute, notFound } from '@tanstack/react-router';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { fetchAppDetails } from '../server/fns';
import { COUCH_CATEGORY_IDS } from '../server/steam/categories';
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

function libraryHeroUrl(appid: number): string {
  return `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${String(appid)}/library_hero.jpg`;
}

function GameDetailPage() {
  const { data } = Route.useLoaderData();
  const couchCategories =
    data.categories?.filter((c: { id: number; description: string }) =>
      COUCH_CATEGORY_IDS.has(c.id),
    ) ?? [];
  const heroBg = libraryHeroUrl(data.steam_appid);
  const screenshotFallback = data.screenshots?.[0]?.path_full ?? data.header_image;
  const storeUrl = `https://store.steampowered.com/app/${String(data.steam_appid)}/`;
  const platforms = data.platforms;
  const platformList =
    platforms !== undefined
      ? [
          platforms.windows ? 'Windows' : null,
          platforms.mac ? 'macOS' : null,
          platforms.linux ? 'Linux' : null,
        ].filter((p): p is string => p !== null)
      : [];

  return (
    <>
      {/* === Cinematic hero === */}
      <Box
        component="header"
        sx={{
          position: 'relative',
          minHeight: { xs: 420, md: 620 },
          display: 'flex',
          alignItems: 'flex-end',
          overflow: 'hidden',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundSize: 'cover',
            backgroundPosition: 'center 30%',
          }}
          style={{
            backgroundImage: `url(${heroBg}), url(${screenshotFallback})`,
          }}
        />
        <Box
          aria-hidden
          sx={{ position: 'absolute', inset: 0 }}
          style={{
            background:
              'linear-gradient(180deg, rgba(14, 12, 10, 0.35) 0%, rgba(14, 12, 10, 0.6) 45%, rgba(14, 12, 10, 0.96) 100%)',
          }}
        />
        <Container maxWidth="xl" sx={{ position: 'relative', py: { xs: 5, md: 8 } }}>
          <Stack spacing={{ xs: 2, md: 3 }} sx={{ maxWidth: 1000 }}>
            {couchCategories.length > 0 && (
              <Stack
                direction="row"
                spacing={2}
                sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                useFlexGap
              >
                <Box sx={{ width: 36, height: 1, backgroundColor: 'primary.main' }} />
                <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700 }}>
                  {couchCategories.map((c) => c.description).join(' · ')}
                </Typography>
              </Stack>
            )}
            <Typography
              variant="h1"
              component="h1"
              sx={{
                fontSize: { xs: 44, sm: 64, md: 96 },
                lineHeight: 0.95,
              }}
            >
              {data.name}
            </Typography>
            {data.developers !== undefined && data.developers.length > 0 && (
              <Typography
                color="text.secondary"
                sx={{
                  fontFamily: 'h1.fontFamily',
                  fontStyle: 'italic',
                  fontSize: { xs: 16, md: 18 },
                }}
              >
                {data.developers.join(', ')}
                {data.publishers !== undefined &&
                  data.publishers.length > 0 &&
                  data.publishers.join(', ') !== data.developers.join(', ') &&
                  `. Published by ${data.publishers.join(', ')}.`}
              </Typography>
            )}
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 5, md: 9 } }}>
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 5, md: 8 },
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(280px, 1fr)' },
            alignItems: 'flex-start',
          }}
        >
          {/* Main column */}
          <Box sx={{ minWidth: 0 }}>
            {/* Editorial pull quote — Steam's short_description treated like a magazine intro */}
            <Box sx={{ mb: { xs: 5, md: 7 } }}>
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                The pitch
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'h1.fontFamily',
                  fontWeight: 400,
                  fontStyle: 'italic',
                  fontSize: { xs: 22, md: 30 },
                  lineHeight: 1.3,
                  letterSpacing: '-0.01em',
                  borderLeft: '2px solid',
                  borderColor: 'primary.main',
                  pl: { xs: 2.5, md: 3.5 },
                }}
              >
                {data.short_description}
              </Typography>
            </Box>

            {/* Screenshots — minimum chrome, scroll bleeds past container edge */}
            {data.screenshots !== undefined && data.screenshots.length > 0 && (
              <Box sx={{ mb: { xs: 5, md: 7 } }}>
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ alignItems: 'baseline', mb: 2 }}
                >
                  <Typography variant="overline" color="text.secondary">
                    Screenshots
                  </Typography>
                  <Box sx={{ flex: 1, height: 1, backgroundColor: 'divider' }} />
                </Stack>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    overflowX: 'auto',
                    pb: 2,
                    mx: { xs: -2, md: 0 },
                    px: { xs: 2, md: 0 },
                    scrollSnapType: 'x mandatory',
                    '& > a': { scrollSnapAlign: 'start' },
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(245, 237, 224, 0.18) transparent',
                    '&::-webkit-scrollbar': { height: 6 },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: 'rgba(245, 237, 224, 0.18)',
                      borderRadius: 3,
                    },
                  }}
                >
                  {data.screenshots
                    .slice(0, 10)
                    .map((s: { id: number; path_thumbnail: string; path_full: string }) => (
                      <Box
                        key={s.id}
                        component="a"
                        href={s.path_full}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          flex: '0 0 auto',
                          width: { xs: 320, md: 480 },
                          aspectRatio: '16 / 9',
                          overflow: 'hidden',
                          border: '1px solid',
                          borderColor: 'divider',
                          transition: 'border-color 200ms ease, transform 200ms ease',
                          '&:hover': {
                            borderColor: 'primary.main',
                            transform: 'translateY(-2px)',
                          },
                          '&:hover img': { transform: 'scale(1.04)' },
                        }}
                      >
                        <Box
                          component="img"
                          src={s.path_thumbnail}
                          alt={`${data.name} screenshot`}
                          loading="lazy"
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                            transition: 'transform 400ms ease',
                          }}
                        />
                      </Box>
                    ))}
                </Box>
              </Box>
            )}

            <FeatureGrid data={data} />
          </Box>

          {/* Sticky sidebar */}
          <Box>
            <Box
              sx={{
                position: { md: 'sticky' },
                top: { md: 96 },
                p: { xs: 3, md: 4 },
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'background.paper',
              }}
            >
              <PriceBlock data={data} />
              <Button
                variant="contained"
                size="large"
                fullWidth
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
                sx={{ mt: 3 }}
              >
                Open on Steam
              </Button>

              <Box sx={{ height: 1, backgroundColor: 'divider', my: 4 }} />

              <Stack spacing={2.5}>
                {data.metacritic !== undefined && (
                  <MetaRow
                    label="Metacritic"
                    value={String(data.metacritic.score)}
                  />
                )}
                {data.recommendations !== undefined && (
                  <MetaRow
                    label="Steam reviews"
                    value={data.recommendations.total.toLocaleString()}
                  />
                )}
                {data.release_date !== undefined && (
                  <MetaRow
                    label="Released"
                    value={
                      data.release_date.coming_soon
                        ? `Coming ${data.release_date.date}`
                        : data.release_date.date
                    }
                  />
                )}
                {platformList.length > 0 && (
                  <MetaRow label="Platforms" value={platformList.join(' · ')} />
                )}
              </Stack>
            </Box>
          </Box>
        </Box>
      </Container>
    </>
  );
}

function PriceBlock({ data }: { data: SteamAppDetails }) {
  const price = data.price_overview;
  if (price !== undefined) {
    const onSale = price.discount_percent > 0;
    return (
      <Stack spacing={1}>
        {onSale && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
            <Box
              sx={{
                px: 1,
                py: 0.25,
                backgroundColor: '#1f3308',
                color: '#a5db5f',
                fontFamily: 'h1.fontFamily',
                fontStyle: 'italic',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              −{price.discount_percent}%
            </Box>
            <Typography
              sx={{
                color: 'text.secondary',
                textDecoration: 'line-through',
                fontSize: 14,
              }}
            >
              {price.initial_formatted}
            </Typography>
          </Stack>
        )}
        <Typography
          variant="h2"
          sx={{
            color: onSale ? '#a5db5f' : 'text.primary',
            fontSize: { xs: 38, md: 48 },
            lineHeight: 1,
          }}
        >
          {price.final_formatted}
        </Typography>
        <Typography variant="overline" color="text.secondary">
          On Steam
        </Typography>
      </Stack>
    );
  }
  if (data.is_free) {
    return (
      <Stack spacing={1}>
        <Typography variant="h2" sx={{ fontSize: { xs: 38, md: 48 }, lineHeight: 1 }}>
          Free
        </Typography>
        <Typography variant="overline" color="text.secondary">
          Free to play
        </Typography>
      </Stack>
    );
  }
  return null;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography
        variant="overline"
        sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 600, fontSize: 15 }}>{value}</Typography>
    </Box>
  );
}

function FeatureGrid({ data }: { data: SteamAppDetails }) {
  const sections: { title: string; items: string[] }[] = [];
  if (data.genres !== undefined && data.genres.length > 0) {
    sections.push({
      title: 'Genres',
      items: data.genres.map((g) => g.description),
    });
  }
  if (data.categories !== undefined && data.categories.length > 0) {
    sections.push({
      title: 'Features',
      items: data.categories.map((c) => c.description),
    });
  }
  if (sections.length === 0) {
    return null;
  }
  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'baseline', mb: 2 }}>
        <Typography variant="overline" color="text.secondary">
          Tags &amp; features
        </Typography>
        <Box sx={{ flex: 1, height: 1, backgroundColor: 'divider' }} />
      </Stack>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 3, sm: 6 }}
        sx={{ alignItems: 'flex-start' }}
      >
        {sections.map((s) => (
          <Box key={s.title} sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: 'h1.fontFamily',
                fontStyle: 'italic',
                fontSize: 16,
                color: 'text.secondary',
                mb: 1.5,
              }}
            >
              {s.title}
            </Typography>
            <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {s.items.map((item) => (
                <Box
                  key={item}
                  sx={{
                    px: 1.25,
                    py: 0.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'text.secondary',
                    transition: 'border-color 160ms ease, color 160ms ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      color: 'primary.main',
                    },
                  }}
                >
                  {item}
                </Box>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
