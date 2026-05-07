import { createFileRoute, useNavigate } from '@tanstack/react-router';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
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

const MOODS: { value: Mood; label: string }[] = [
  { value: 'all', label: 'All couch games' },
  { value: 'party', label: 'Party' },
  { value: 'brain', label: 'Brain & strategy' },
  { value: 'story', label: 'Co-op story' },
  { value: 'versus', label: 'Versus' },
];

const SORTS: { value: SteamSort; label: string }[] = [
  { value: 'topsellers', label: 'Top sellers' },
  { value: 'newreleases', label: 'New releases' },
  { value: 'globaltopsellers', label: 'Global top' },
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

  /** Patch search params and reset paging to the first page (filter changed → start over). */
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

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 800, mb: 1 }}>
        Browse couch picks
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Filter by mood, sort, and sale. Same-screen / split-screen filter is applied to every result.
      </Typography>

      <Stack spacing={2} sx={{ mb: 4 }}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Mood
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
            {MOODS.map((m) => (
              <Chip
                key={m.value}
                label={m.label}
                color={search.mood === m.value ? 'primary' : 'default'}
                variant={search.mood === m.value ? 'filled' : 'outlined'}
                onClick={() => {
                  updateFilter({ mood: m.value });
                }}
              />
            ))}
          </Stack>
        </Box>

        <Box>
          <Typography variant="overline" color="text.secondary">
            Sort
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
            {SORTS.map((s) => (
              <Chip
                key={s.value}
                label={s.label}
                color={search.sort === s.value ? 'primary' : 'default'}
                variant={search.sort === s.value ? 'filled' : 'outlined'}
                onClick={() => {
                  updateFilter({ sort: s.value });
                }}
              />
            ))}
          </Stack>
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={search.specials}
              onChange={(e) => {
                updateFilter({ specials: e.target.checked });
              }}
            />
          }
          label="On sale only"
        />
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Showing {result.games.length.toLocaleString()} of{' '}
        {result.totalCount.toLocaleString()} matching games on Steam.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(4, 1fr)',
            lg: 'repeat(5, 1fr)',
          },
        }}
      >
        {result.games.map((game: SteamGameSummary) => (
          <GameCard key={game.appid} game={game} />
        ))}
      </Box>
      {result.games.length === 0 && (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h6">No matches.</Typography>
          <Typography variant="body2" color="text.secondary">
            Try a different mood or turn off the sale filter.
          </Typography>
        </Box>
      )}
      {result.games.length > 0 && !reachedEnd && (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Button
            variant="outlined"
            size="large"
            onClick={showMore}
            disabled={reachedMax || isLoading}
          >
            {reachedMax
              ? `Showing the first ${String(MAX_PAGE_COUNT * PAGE_SIZE)} — refine filters for the rest`
              : isLoading
                ? 'Loading…'
                : 'Show more'}
          </Button>
        </Box>
      )}
    </Container>
  );
}
