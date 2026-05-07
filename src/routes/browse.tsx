import { createFileRoute, useNavigate } from '@tanstack/react-router';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { searchCouchGames } from '../server/fns';
import { STEAM_CATEGORY } from '../server/steam/categories';
import type { SteamSort } from '../server/steam/categories';
import type { SteamGameSummary } from '../server/steam/types';
import { GameCard } from '../components/GameCard';

type Mood = 'party' | 'brain' | 'story' | 'versus' | 'all';

interface BrowseSearch {
  mood: Mood;
  sort: SteamSort;
  specials: boolean;
  pageCount: number;
}

const PAGE_SIZE = 25;
const MAX_PAGE_COUNT = 8;

const MOODS: { value: Mood; label: string; hint: string }[] = [
  { value: 'all', label: 'Everything', hint: 'All same-screen games' },
  { value: 'party', label: 'Loud & silly', hint: 'Party-friendly' },
  { value: 'brain', label: 'Plan & betray', hint: 'Strategy & co-op planning' },
  { value: 'story', label: 'Co-op story', hint: 'Story campaigns' },
  { value: 'versus', label: 'Versus', hint: 'Versus & brawlers' },
];

const SORTS: { value: SteamSort; label: string; hint: string }[] = [
  { value: 'topsellers', label: 'Top sellers', hint: 'What people are buying' },
  { value: 'newreleases', label: 'New releases', hint: 'Just came out' },
  { value: 'globaltopsellers', label: 'All-time hits', hint: 'Long-term favourites' },
];

function moodToCategoryIds(mood: Mood): number[] {
  switch (mood) {
    case 'party':
    case 'all':
      return [STEAM_CATEGORY.sharedSplitScreen];
    case 'brain':
    case 'story':
      return [STEAM_CATEGORY.sharedSplitScreenCoop];
    case 'versus':
      return [STEAM_CATEGORY.sharedSplitScreenPvp];
  }
}

export const Route = createFileRoute('/browse')({
  validateSearch: (search: Record<string, unknown>): BrowseSearch => {
    const moodRaw = search.mood;
    const mood: Mood =
      moodRaw === 'party' ||
      moodRaw === 'brain' ||
      moodRaw === 'story' ||
      moodRaw === 'versus'
        ? moodRaw
        : 'all';
    const sortRaw = search.sort;
    const sort: SteamSort =
      sortRaw === 'topsellers' ||
      sortRaw === 'newreleases' ||
      sortRaw === 'globaltopsellers' ||
      sortRaw === 'release_date'
        ? sortRaw
        : 'topsellers';
    const specials = search.specials === true || search.specials === 'true';
    const pageCountRaw =
      typeof search.pageCount === 'number'
        ? search.pageCount
        : typeof search.pageCount === 'string'
          ? Number.parseInt(search.pageCount, 10)
          : 1;
    const pageCount = Number.isFinite(pageCountRaw)
      ? Math.max(1, Math.min(MAX_PAGE_COUNT, Math.floor(pageCountRaw)))
      : 1;
    return { mood, sort, specials, pageCount };
  },
  loaderDeps: ({ search }) => ({
    mood: search.mood,
    sort: search.sort,
    specials: search.specials,
    pageCount: search.pageCount,
  }),
  loader: async ({ deps }) => {
    const result = await searchCouchGames({
      data: {
        categoryIds: moodToCategoryIds(deps.mood),
        sort: deps.sort,
        specials: deps.specials,
        pageCount: deps.pageCount,
      },
    });
    return { result };
  },
  staleTime: 5 * 60 * 1000,
  component: BrowsePage,
});

function BrowsePage() {
  const search = Route.useSearch();
  const { result } = Route.useLoaderData();
  const isLoading = Route.useMatch({ select: (m) => m.status === 'pending' });
  const navigate = useNavigate();

  const updateFilter = (patch: Partial<Omit<BrowseSearch, 'pageCount'>>) => {
    void navigate({
      to: '/browse',
      search: { ...search, ...patch, pageCount: 1 },
    });
  };

  const showMore = () => {
    void navigate({
      to: '/browse',
      search: { ...search, pageCount: Math.min(MAX_PAGE_COUNT, search.pageCount + 1) },
      resetScroll: false,
    });
  };

  const reachedMax = search.pageCount >= MAX_PAGE_COUNT;
  const reachedEnd = result.games.length >= result.totalCount;
  const activeMood = MOODS.find((m) => m.value === search.mood) ?? MOODS[0];

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 4, md: 8 } }}>
      <Stack spacing={2} sx={{ mb: { xs: 5, md: 8 }, maxWidth: 920 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Box sx={{ width: 36, height: 1, backgroundColor: 'primary.main' }} />
          <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700 }}>
            The catalog
          </Typography>
        </Stack>
        <Typography
          variant="h1"
          component="h1"
          sx={{
            fontSize: { xs: 48, md: 84 },
            lineHeight: 0.95,
          }}
        >
          Every same-screen game on Steam.
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
          Filter by the kind of evening you&apos;re having. Same-screen and
          split-screen are always on.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 4, md: 6 },
          gridTemplateColumns: { xs: '1fr', md: '240px 1fr' },
          alignItems: 'flex-start',
        }}
      >
        {/* Sticky sidebar — filter sections */}
        <Box
          component="aside"
          sx={{
            position: { md: 'sticky' },
            top: { md: 96 },
            alignSelf: 'flex-start',
          }}
        >
          <FilterSection title="Mood">
            {MOODS.map((m) => (
              <FilterRow
                key={m.value}
                active={search.mood === m.value}
                label={m.label}
                hint={m.hint}
                onClick={() => {
                  updateFilter({ mood: m.value });
                }}
              />
            ))}
          </FilterSection>
          <FilterSection title="Sort">
            {SORTS.map((s) => (
              <FilterRow
                key={s.value}
                active={search.sort === s.value}
                label={s.label}
                hint={s.hint}
                onClick={() => {
                  updateFilter({ sort: s.value });
                }}
              />
            ))}
          </FilterSection>
          <FilterSection title="Price">
            <FilterRow
              active={!search.specials}
              label="All prices"
              hint="Full catalog"
              onClick={() => {
                updateFilter({ specials: false });
              }}
            />
            <FilterRow
              active={search.specials}
              label="On sale only"
              hint="Discounted right now"
              accent="#a5db5f"
              onClick={() => {
                updateFilter({ specials: true });
              }}
            />
          </FilterSection>
        </Box>

        {/* Results column */}
        <Box sx={{ minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={2}
            sx={{ alignItems: 'baseline', mb: 3, flexWrap: 'wrap' }}
            useFlexGap
          >
            <Typography
              variant="h5"
              component="h2"
              sx={{ fontSize: { xs: 22, md: 28 } }}
            >
              {activeMood?.label ?? 'Everything'}
            </Typography>
            <Typography
              color="text.secondary"
              sx={{
                fontFamily: 'h1.fontFamily',
                fontStyle: 'italic',
                fontSize: 14,
              }}
            >
              {result.games.length.toLocaleString()} of{' '}
              {result.totalCount.toLocaleString()} games
              {search.specials && ' · sale only'}
            </Typography>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gap: { xs: 2, md: 3 },
              gridTemplateColumns: {
                // minmax(0, 1fr) — without the explicit 0 floor, `1fr` columns
                // expand to the widest card's intrinsic min-content (set by
                // the <img> file dimensions). Steam serves capsules at varying
                // pixel widths so the columns end up unequal otherwise.
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(3, minmax(0, 1fr))',
                md: 'repeat(3, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr))',
              },
            }}
          >
            {result.games.map((game: SteamGameSummary) => (
              <GameCard key={game.appid} game={game} layout="grid" />
            ))}
            {isLoading &&
              // Placeholder cells that mirror the card's aspect ratio so the
              // grid grows immediately when "Show more" is clicked, instead
              // of leaving the user staring at the same scrollable view.
              Array.from({ length: PAGE_SIZE }).map((_unused, i) => (
                <GameCardSkeleton key={`sk-${String(i)}`} />
              ))}
          </Box>

          {result.games.length === 0 && (
            <Box sx={{ py: 10, textAlign: 'center' }}>
              <Typography
                variant="h4"
                sx={{ fontStyle: 'italic', color: 'text.secondary', mb: 1 }}
              >
                Nothing matches.
              </Typography>
              <Typography color="text.secondary">
                Try a different mood, or turn off the sale filter.
              </Typography>
            </Box>
          )}

          {result.games.length > 0 && !reachedEnd && (
            <Box sx={{ py: 5, textAlign: 'center' }}>
              <Button
                variant="outlined"
                size="large"
                onClick={showMore}
                disabled={reachedMax || isLoading}
                startIcon={
                  isLoading && !reachedMax ? (
                    <CircularProgress size={14} thickness={5} color="inherit" />
                  ) : null
                }
                sx={{
                  minWidth: 200,
                  transition: 'transform 120ms ease',
                  '&:active': {
                    transform: 'scale(0.97)',
                  },
                }}
              >
                {reachedMax
                  ? `Showing the first ${String(MAX_PAGE_COUNT * PAGE_SIZE)}. Refine filters for the rest.`
                  : isLoading
                    ? 'Loading more'
                    : 'Show more'}
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Container>
  );
}

function GameCardSkeleton() {
  return (
    <Box
      sx={{
        width: '100%',
        animation: 'sk-fade 240ms ease both',
        '@keyframes sk-fade': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      }}
    >
      <Box
        sx={{
          aspectRatio: '460 / 215',
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'rgba(245, 237, 224, 0.04)',
          // Sheen sweeps across the placeholder so the grid feels like it's
          // doing something even before the new data lands.
          backgroundImage:
            'linear-gradient(110deg, transparent 30%, rgba(255, 209, 102, 0.08) 50%, transparent 70%)',
          backgroundSize: '300% 100%',
          animation: 'sk-sheen 1400ms ease-in-out infinite',
          '@keyframes sk-sheen': {
            from: { backgroundPosition: '120% 0' },
            to: { backgroundPosition: '-20% 0' },
          },
        }}
      />
      <Stack spacing={0.75} sx={{ pt: 1.5, px: 0.25 }}>
        <Box
          sx={{
            height: '1.25em',
            width: '70%',
            backgroundColor: 'rgba(245, 237, 224, 0.08)',
          }}
        />
        <Box
          sx={{
            height: 11,
            width: '40%',
            backgroundColor: 'rgba(245, 237, 224, 0.06)',
          }}
        />
        <Box
          sx={{
            height: 14,
            width: '30%',
            backgroundColor: 'rgba(245, 237, 224, 0.06)',
          }}
        />
      </Stack>
    </Box>
  );
}

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
}

function FilterSection({ title, children }: FilterSectionProps) {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant="overline"
        sx={{
          color: 'text.secondary',
          display: 'block',
          mb: 1.5,
          pb: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {title}
      </Typography>
      <Stack spacing={0}>{children}</Stack>
    </Box>
  );
}

interface FilterRowProps {
  active: boolean;
  label: string;
  hint: string;
  accent?: string;
  onClick: () => void;
}

function FilterRow({ active, label, hint, accent, onClick }: FilterRowProps) {
  const activeColor = accent ?? 'var(--mui-palette-primary-main)';
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        all: 'unset',
        cursor: 'pointer',
        display: 'block',
        py: 1,
        position: 'relative',
        pl: 2,
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2,
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 8,
          bottom: 8,
          width: 2,
          backgroundColor: active ? activeColor : 'transparent',
          transition: 'background-color 160ms ease',
        },
        '&:hover .filter-label': {
          color: active ? activeColor : 'text.primary',
        },
      }}
    >
      <Typography
        className="filter-label"
        sx={{
          fontWeight: active ? 700 : 500,
          fontSize: 15,
          color: active ? activeColor : 'text.secondary',
          transition: 'color 160ms ease',
          lineHeight: 1.25,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: 'h1.fontFamily',
          fontStyle: 'italic',
          fontSize: 12,
          color: 'text.secondary',
          opacity: 0.75,
          mt: 0.25,
        }}
      >
        {hint}
      </Typography>
    </Box>
  );
}
