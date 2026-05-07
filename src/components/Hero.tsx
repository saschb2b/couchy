import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { useEffect, useRef, useState } from 'react';
import { ButtonLink } from './RouterLinks';
import { TrailerPlayer } from './TrailerPlayer';
import type { SteamGameSummary } from '../server/steam/types';

interface HeroProps {
  /** Up to ~4 games to rotate through. Empty = static fallback hero. */
  spotlights: SteamGameSummary[];
  /** Currently selected player count (2..5 where 5 means 5+); null = no filter. */
  playerCount: number | null;
  onPlayerCountChange: (count: number | null) => void;
}

const ROTATE_MS = 9000;
const PLAYER_COUNTS = [2, 3, 4, 5] as const;

function libraryHeroUrl(appid: number): string {
  return `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${String(appid)}/library_hero.jpg`;
}

export function Hero({ spotlights, playerCount, onPlayerCountChange }: HeroProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const startedAt = useRef<number>(performance.now());

  const safeIdx = spotlights.length === 0 ? 0 : activeIdx % spotlights.length;
  const current = spotlights[safeIdx] ?? null;

  // Auto-advance with progress line. Single rAF loop drives both — restarts
  // on index/pause changes so the progress bar stays in sync with rotation.
  useEffect(() => {
    if (spotlights.length <= 1 || paused) return undefined;
    startedAt.current = performance.now();
    setProgress(0);
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - startedAt.current;
      const pct = Math.min(1, elapsed / ROTATE_MS);
      setProgress(pct);
      if (pct >= 1) {
        setActiveIdx((i) => (i + 1) % spotlights.length);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [activeIdx, paused, spotlights.length]);

  // Pre-load the next spotlight's library_hero so the crossfade is seamless.
  useEffect(() => {
    if (spotlights.length <= 1) return;
    const next = spotlights[(safeIdx + 1) % spotlights.length];
    if (next === undefined) return;
    const img = new Image();
    img.src = libraryHeroUrl(next.appid);
  }, [safeIdx, spotlights]);

  const heroImage = current !== null ? libraryHeroUrl(current.appid) : null;
  const fallbackImage = current?.capsuleImage ?? null;

  return (
    <Box
      component="section"
      onMouseEnter={() => {
        setPaused(true);
      }}
      onMouseLeave={() => {
        setPaused(false);
      }}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: { xs: 560, md: 680 },
        display: 'flex',
        alignItems: 'flex-end',
        mb: { xs: 8, md: 12 },
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Image background. Crossfades across spotlight changes. */}
      <Box
        key={`bg-${current?.appid ?? 'none'}`}
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          opacity: 0,
          animation: 'hero-fade-in 700ms ease forwards',
          '@keyframes hero-fade-in': {
            from: { opacity: 0 },
            to: { opacity: 1 },
          },
          ...(heroImage === null && {
            filter: 'blur(40px) saturate(1.2)',
            transform: 'scale(1.2)',
          }),
        }}
        style={{
          backgroundImage:
            heroImage !== null
              ? `url(${heroImage})`
              : fallbackImage !== null
                ? `url(${fallbackImage})`
                : undefined,
        }}
      />
      {/* Trailer video overlay. Only for the current spotlight; key forces a
          fresh element per appid so hls.js destroys + reloads cleanly. */}
      {current?.trailerHls !== null && current?.trailerHls !== undefined && (
        <Box
          key={`vid-${current.appid}`}
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            animation: 'hero-vid-fade 1200ms ease 600ms forwards',
            '@keyframes hero-vid-fade': {
              from: { opacity: 0 },
              to: { opacity: 1 },
            },
          }}
        >
          <TrailerPlayer
            src={current.trailerHls}
            controls={false}
            loop
            muted
            autoPlay
            objectPosition="center 30%"
          />
        </Box>
      )}
      {/* Gradient + warm radial wash on top of image/video. */}
      <Box
        aria-hidden
        sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        style={{
          background:
            'linear-gradient(180deg, rgba(14, 12, 10, 0.35) 0%, rgba(14, 12, 10, 0.55) 40%, rgba(14, 12, 10, 0.95) 100%), radial-gradient(ellipse 80% 60% at 30% 100%, rgba(255, 209, 102, 0.18) 0%, transparent 60%)',
        }}
      />

      <Container maxWidth="xl" sx={{ position: 'relative', py: { xs: 6, md: 10 } }}>
        <Stack spacing={{ xs: 3, md: 4 }} sx={{ maxWidth: 880 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 36,
                height: 1,
                backgroundColor: 'primary.main',
              }}
            />
            <Typography
              variant="overline"
              sx={{
                color: 'primary.main',
                fontWeight: 700,
              }}
            >
              Tonight on Steam
            </Typography>
          </Stack>

          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontSize: { xs: 56, sm: 84, md: 124 },
              maxWidth: { xs: '100%', md: '11ch' },
              fontVariationSettings: '"opsz" 144',
            }}
          >
            What should{' '}
            <Box component="em" sx={{ color: 'primary.main', fontStyle: 'italic' }}>
              we
            </Box>{' '}
            play tonight?
          </Typography>

          <Typography
            variant="h6"
            color="text.secondary"
            sx={{
              fontFamily: 'h1.fontFamily',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: { xs: 18, md: 22 },
              maxWidth: 620,
              lineHeight: 1.4,
            }}
          >
            Games worth firing up when friends are over and the controllers
            are already on the table.
          </Typography>

          <PlayerCountSelector value={playerCount} onChange={onPlayerCountChange} />

          {current !== null && (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{
                pt: { xs: 1, md: 2 },
                alignItems: { sm: 'center' },
              }}
            >
              <ButtonLink
                to="/game/$appid"
                params={{ appid: String(current.appid) }}
                variant="contained"
                size="large"
              >
                Start with {current.name}
              </ButtonLink>
              <ButtonLink
                to="/browse"
                search={{
                  mood: 'all',
                  sort: 'topsellers',
                  specials: false,
                  pageCount: 1,
                }}
                variant="outlined"
                size="large"
              >
                Browse the catalog
              </ButtonLink>
            </Stack>
          )}
        </Stack>
      </Container>

      {/* Rotation progress + dot indicators */}
      {spotlights.length > 1 && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
          }}
        >
          <Container maxWidth="xl" sx={{ pb: 2 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
              {spotlights.map((s, i) => (
                <Box
                  key={s.appid}
                  component="button"
                  type="button"
                  onClick={() => {
                    setActiveIdx(i);
                  }}
                  aria-label={`Spotlight ${String(i + 1)}: ${s.name}`}
                  sx={{
                    all: 'unset',
                    cursor: 'pointer',
                    width: 28,
                    height: 14,
                    display: 'flex',
                    alignItems: 'center',
                    '&:focus-visible::after': {
                      outline: '2px solid',
                      outlineColor: 'primary.main',
                      outlineOffset: 2,
                    },
                    '&::after': {
                      content: '""',
                      width: '100%',
                      height: 2,
                      background:
                        i === safeIdx
                          ? 'rgba(245, 237, 224, 0.25)'
                          : 'rgba(245, 237, 224, 0.12)',
                      transition: 'background 200ms ease',
                    },
                  }}
                />
              ))}
            </Stack>
          </Container>
          <Box
            sx={{
              height: 2,
              width: '100%',
              backgroundColor: 'rgba(245, 237, 224, 0.06)',
            }}
          >
            <Box
              sx={{
                height: '100%',
                backgroundColor: 'primary.main',
                width: `${String(progress * 100)}%`,
                transition: paused ? 'none' : 'width 60ms linear',
              }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}

interface PlayerCountSelectorProps {
  value: number | null;
  onChange: (next: number | null) => void;
}

function PlayerCountSelector({ value, onChange }: PlayerCountSelectorProps) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: 'center',
        flexWrap: 'wrap',
        rowGap: 1,
      }}
      useFlexGap
    >
      <Typography
        sx={{
          fontFamily: 'h1.fontFamily',
          fontStyle: 'italic',
          color: 'text.secondary',
          fontSize: { xs: 14, md: 16 },
          mr: { xs: 0.5, md: 1 },
        }}
      >
        On the couch tonight:
      </Typography>
      {PLAYER_COUNTS.map((n) => {
        const active = value === n;
        const label = n === 5 ? '5+' : String(n);
        return (
          <Box
            key={n}
            component="button"
            type="button"
            aria-pressed={active}
            onClick={() => {
              onChange(active ? null : n);
            }}
            sx={{
              all: 'unset',
              cursor: 'pointer',
              minWidth: 38,
              height: 36,
              px: 1.5,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid',
              borderColor: active ? 'primary.main' : 'rgba(245, 237, 224, 0.22)',
              backgroundColor: active ? 'primary.main' : 'transparent',
              color: active ? 'background.default' : 'text.primary',
              fontFamily: 'body1.fontFamily',
              fontWeight: 600,
              fontSize: 15,
              letterSpacing: '0.01em',
              transition: 'border-color 160ms ease, background-color 160ms ease, color 160ms ease',
              '&:hover': {
                borderColor: 'primary.main',
                color: active ? 'background.default' : 'primary.main',
              },
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: 2,
              },
            }}
          >
            {label}
          </Box>
        );
      })}
    </Stack>
  );
}
