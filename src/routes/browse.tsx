import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { useEffect, useRef } from 'react';
import { searchCouchGames } from '../server/fns';
import { STEAM_CATEGORY, STEAM_TAG } from '../server/steam/categories';
import type { SteamSort } from '../server/steam/categories';
import type { SteamGameSummary } from '../server/steam/types';
import { GameCard } from '../components/GameCard';

type Mood = 'party' | 'brain' | 'story' | 'versus' | 'all';
type Party = 0 | 2 | 3 | 4 | 5;

interface BrowseSearch {
  mood: Mood;
  sort: SteamSort;
  specials: boolean;
  party: Party;
  pageCount: number;
}

const PAGE_SIZE = 25;
/**
 * Client-side sanity ceiling on pageCount. Not a product cap — the server's
 * validator clamps too, and Steam's `totalCount` is the real end. This is
 * here purely so a broken client can't request 10,000 pages and DOS us.
 */
const MAX_PAGE_COUNT = 200;

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

const PARTY_SIZES: { value: Party; short: string; hint: string }[] = [
  { value: 0, short: 'Any', hint: 'Any party size' },
  { value: 2, short: '2', hint: 'Fits a pair' },
  { value: 3, short: '3', hint: 'Fits a trio' },
  { value: 4, short: '4', hint: 'Fits four' },
  { value: 5, short: '5+', hint: 'Big group' },
];

/**
 * Does `game` accommodate a party of `partySize`?
 *
 * Prefer PCGamingWiki's structured min/max range when we have it (high
 * confidence: hand-edited wiki rows). Fall back to the description-parsed
 * `maxPlayers` when only that exists, treating it as `min=2, max=N` so we
 * don't lose Steam-cat-24 games the wiki hasn't catalogued. Games with
 * neither signal are excluded when the filter is active — honest about
 * uncertainty.
 */
function fitsParty(game: SteamGameSummary, partySize: number): boolean {
  if (partySize <= 0) return true;
  const lp = game.localPlayers;
  if (lp !== null) {
    return partySize >= lp.min && partySize <= lp.max;
  }
  if (game.maxPlayers !== null) {
    return partySize >= 2 && partySize <= game.maxPlayers;
  }
  return false;
}

interface MoodFilter {
  categoryIds: number[];
  tagIds?: number[];
}

// All five moods now resolve to distinct Steam queries. The hint copy in the
// MOODS table below has to stay in sync with the tag chosen here, otherwise
// users see "Strategy & co-op planning" and get a Story Rich rail.
function moodToFilter(mood: Mood): MoodFilter {
  switch (mood) {
    case 'all':
      return { categoryIds: [STEAM_CATEGORY.sharedSplitScreen] };
    case 'party':
      return {
        categoryIds: [STEAM_CATEGORY.sharedSplitScreen],
        tagIds: [STEAM_TAG.partyGame],
      };
    case 'brain':
      return {
        categoryIds: [STEAM_CATEGORY.sharedSplitScreenCoop],
        tagIds: [STEAM_TAG.strategy],
      };
    case 'story':
      return {
        categoryIds: [STEAM_CATEGORY.sharedSplitScreenCoop],
        tagIds: [STEAM_TAG.storyRich],
      };
    case 'versus':
      return { categoryIds: [STEAM_CATEGORY.sharedSplitScreenPvp] };
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
    const partyRaw =
      typeof search.party === 'number'
        ? search.party
        : typeof search.party === 'string'
          ? Number.parseInt(search.party, 10)
          : 0;
    const party: Party =
      partyRaw === 2 || partyRaw === 3 || partyRaw === 4 || partyRaw === 5
        ? partyRaw
        : 0;
    const pageCountRaw =
      typeof search.pageCount === 'number'
        ? search.pageCount
        : typeof search.pageCount === 'string'
          ? Number.parseInt(search.pageCount, 10)
          : 1;
    const pageCount = Number.isFinite(pageCountRaw)
      ? Math.max(1, Math.min(MAX_PAGE_COUNT, Math.floor(pageCountRaw)))
      : 1;
    return { mood, sort, specials, party, pageCount };
  },
  loaderDeps: ({ search }) => ({
    mood: search.mood,
    sort: search.sort,
    specials: search.specials,
    pageCount: search.pageCount,
  }),
  loader: async ({ deps }) => {
    const filter = moodToFilter(deps.mood);
    const result = await searchCouchGames({
      data: {
        categoryIds: filter.categoryIds,
        ...(filter.tagIds !== undefined && { tagIds: filter.tagIds }),
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
  const router = useRouter();

  const updateFilter = (patch: Partial<Omit<BrowseSearch, 'pageCount'>>) => {
    void navigate({
      to: '/browse',
      search: { ...search, ...patch, pageCount: 1 },
    });
  };

  // Party-size is a client-side filter on already-loaded results, so flipping
  // it must not reset `pageCount` (would throw away 10 pages of scroll for a
  // free in-memory filter).
  const updateParty = (party: Party) => {
    void navigate({
      to: '/browse',
      search: { ...search, party },
      resetScroll: false,
    });
  };

  const loadMore = () => {
    void navigate({
      to: '/browse',
      search: { ...search, pageCount: Math.min(MAX_PAGE_COUNT, search.pageCount + 1) },
      resetScroll: false,
    });
  };

  // totalCount can come back as 0 when Steam serves a markup variant we don't
  // parse (seen on datacenter IPs for cat 24). In that case "reached end" is
  // unknowable from the count alone; let the IntersectionObserver keep
  // probing — Steam returns an empty page eventually and reachedEnd flips.
  const knownTotal = result.totalCount > 0 ? result.totalCount : null;
  // `partial` halts auto-load too: Steam is rate-limiting us, so the right
  // move is to stop hammering and let the user decide when to retry.
  const reachedEnd =
    result.partial ||
    (knownTotal !== null && result.games.length >= knownTotal) ||
    search.pageCount >= MAX_PAGE_COUNT;
  const activeMood = MOODS.find((m) => m.value === search.mood) ?? MOODS[0];

  const filteredGames =
    search.party === 0
      ? result.games
      : result.games.filter((g) => fitsParty(g, search.party));
  const partyActive = search.party > 0;

  // Infinite scroll: a sentinel below the grid auto-triggers the next page
  // when it enters the viewport. The 600px root margin gives us a head start
  // so the next batch usually lands before the user scrolls into the empty
  // zone.
  //
  // The observer is *armed* after a short delay on every re-render. Without
  // the delay, a sparse-filter view (e.g. party=5+) leaves the sentinel
  // permanently in view, and the observer chains pages back-to-back fast
  // enough to trip Steam's rate limit (~40 req/min). The 1800ms gate caps
  // chained fetches at roughly that rate even when sentinel never leaves
  // the viewport, while staying invisible during normal scrolling (the user
  // is rarely at the sentinel exactly 1.8s after a load).
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (sentinel === null) return undefined;
    if (isLoading || reachedEnd) return undefined;
    let observer: IntersectionObserver | null = null;
    const arm = setTimeout(() => {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting === true) {
            loadMore();
          }
        },
        { rootMargin: '600px 0px' },
      );
      observer.observe(sentinel);
    }, 1800);
    return () => {
      clearTimeout(arm);
      observer?.disconnect();
    };
    // loadMore closes over `search`; depending on search.pageCount is
    // sufficient to re-create the observer after each navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, reachedEnd, search.pageCount]);

  const retry = () => {
    void router.invalidate();
  };

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

      {/* Party size — the most load-bearing decision, so it's its own
          strip above the grid instead of buried under mood/sort/price. */}
      <Box
        sx={{
          mb: { xs: 5, md: 7 },
          py: { xs: 3, md: 4 },
          borderTop: '1px solid',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 2.5, md: 4 }}
          sx={{ alignItems: { md: 'center' } }}
        >
          <Box sx={{ minWidth: { md: 260 } }}>
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ alignItems: 'center', mb: 0.75 }}
            >
              <Box sx={{ width: 24, height: 1, backgroundColor: 'primary.main' }} />
              <Typography
                variant="overline"
                sx={{ color: 'primary.main', fontWeight: 700 }}
              >
                Start here
              </Typography>
            </Stack>
            <Typography
              sx={{
                fontFamily: 'h1.fontFamily',
                fontSize: { xs: 24, md: 30 },
                lineHeight: 1.05,
                letterSpacing: '-0.025em',
              }}
            >
              How many on the couch tonight?
            </Typography>
          </Box>
          <Box
            sx={{
              flex: 1,
              display: 'grid',
              gap: { xs: 1, md: 1.5 },
              gridTemplateColumns: 'repeat(5, 1fr)',
            }}
          >
            {PARTY_SIZES.map((p) => (
              <PartyButton
                key={p.value}
                active={search.party === p.value}
                short={p.short}
                hint={p.hint}
                onClick={() => {
                  updateParty(p.value);
                }}
              />
            ))}
          </Box>
        </Stack>
        <Typography
          sx={{
            fontFamily: 'h1.fontFamily',
            fontStyle: 'italic',
            fontSize: 11,
            color: 'text.secondary',
            opacity: 0.65,
            mt: 2,
            lineHeight: 1.5,
            maxWidth: 720,
          }}
        >
          Backed by PCGamingWiki&apos;s local-play data with Steam descriptions as
          a fallback. Games with neither are hidden when you pick a size.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 4, md: 6 },
          gridTemplateColumns: { xs: '1fr', md: '240px 1fr' },
          alignItems: 'flex-start',
        }}
      >
        {/* Sticky sidebar — filter sections. `maxHeight` + `overflowY: auto`
            keep all sections reachable on shorter viewports; without these,
            a tall filter list under `position: sticky` clips the bottom. */}
        <Box
          component="aside"
          sx={{
            position: { md: 'sticky' },
            top: { md: 96 },
            alignSelf: 'flex-start',
            maxHeight: { md: 'calc(100vh - 112px)' },
            overflowY: { md: 'auto' },
            pr: { md: 1 },
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(245, 237, 224, 0.15)',
              borderRadius: 2,
            },
            '&::-webkit-scrollbar-thumb:hover': {
              backgroundColor: 'rgba(245, 237, 224, 0.25)',
            },
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(245, 237, 224, 0.18) transparent',
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
              {partyActive
                ? `${filteredGames.length.toLocaleString()} games`
                : knownTotal === null
                  ? `${result.games.length.toLocaleString()} games`
                  : `${result.games.length.toLocaleString()} of ${knownTotal.toLocaleString()} games`}
              {search.specials && ' · sale only'}
              {partyActive && ` · fits ${String(search.party)}${search.party === 5 ? '+' : ''}`}
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
            {filteredGames.map((game: SteamGameSummary) => (
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

          {result.games.length > 0 &&
            filteredGames.length === 0 &&
            reachedEnd &&
            !result.partial && (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <Typography
                  variant="h5"
                  sx={{ fontStyle: 'italic', color: 'text.secondary', mb: 1 }}
                >
                  Nothing fits that party.
                </Typography>
                <Typography color="text.secondary">
                  No games in this mood fit {search.party}
                  {search.party === 5 ? '+' : ''} on the couch. Try a different
                  mood or party size.
                </Typography>
              </Box>
            )}

          {result.partial && (
            <Box
              sx={{
                mt: 4,
                py: 3,
                px: 3,
                borderTop: '1px solid',
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                alignItems: { sm: 'center' },
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontFamily: 'h1.fontFamily',
                    fontStyle: 'italic',
                    fontSize: 18,
                    color: 'text.primary',
                    mb: 0.5,
                  }}
                >
                  Steam is rate-limiting us.
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{ fontSize: 13, maxWidth: 520 }}
                >
                  We paused scrolling to avoid making it worse. Give it a minute
                  and try again.
                </Typography>
              </Box>
              <Box
                component="button"
                type="button"
                onClick={retry}
                sx={{
                  all: 'unset',
                  cursor: 'pointer',
                  px: 2.5,
                  py: 1.25,
                  border: '1px solid',
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  fontWeight: 600,
                  fontSize: 14,
                  letterSpacing: '-0.005em',
                  transition: 'background-color 160ms ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 209, 102, 0.08)',
                  },
                  '&:focus-visible': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: 2,
                  },
                }}
              >
                Try again
              </Box>
            </Box>
          )}

          {result.games.length > 0 && !reachedEnd && (
            <Box ref={sentinelRef} aria-hidden sx={{ height: 1, py: 4 }} />
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

interface PartyButtonProps {
  active: boolean;
  short: string;
  hint: string;
  onClick: () => void;
}

function PartyButton({ active, short, hint, onClick }: PartyButtonProps) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        all: 'unset',
        cursor: 'pointer',
        textAlign: 'center',
        py: { xs: 1.5, md: 2 },
        px: 1,
        border: '1px solid',
        borderColor: active ? 'primary.main' : 'divider',
        backgroundColor: active ? 'rgba(255, 209, 102, 0.06)' : 'transparent',
        transition: 'border-color 160ms ease, background-color 160ms ease',
        '&:hover': {
          borderColor: active ? 'primary.main' : 'rgba(245, 237, 224, 0.28)',
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2,
        },
      }}
    >
      <Typography
        component="span"
        sx={{
          display: 'block',
          fontFamily: 'h1.fontFamily',
          fontSize: { xs: 22, md: 28 },
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          color: active ? 'primary.main' : 'text.primary',
          transition: 'color 160ms ease',
        }}
      >
        {short}
      </Typography>
      <Typography
        component="span"
        sx={{
          display: { xs: 'none', sm: 'block' },
          fontFamily: 'h1.fontFamily',
          fontStyle: 'italic',
          fontSize: 11,
          color: 'text.secondary',
          opacity: 0.85,
          mt: 0.75,
          lineHeight: 1.2,
        }}
      >
        {hint}
      </Typography>
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
