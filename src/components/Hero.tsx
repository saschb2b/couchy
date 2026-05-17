import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { Link } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { ButtonLink } from './RouterLinks';
import { TrailerPlayer } from './TrailerPlayer';
import type { SteamGameSummary } from '../server/steam/types';

interface HeroProps {
  /**
   * The full pool of games to channel-surf through. Order matters: the
   * caller should put curated/spotlight picks first so the Hero opens
   * with the editorial set before continuing into the wider pool.
   */
  clips: SteamGameSummary[];
}

const PLAYER_COUNTS = [2, 3, 4, 5] as const;

// Wall-clock time on a single clip before we force a channel change.
// Hero is brand-voice + variety — we want movement, not full playback,
// so the cap is short. Trailers shorter than this still advance early
// via the trailer's `onEnded`; trailers longer get cut at 12 s.
// /tv has a different deal (no cap, full clip plays) because it's the
// dedicated channel-surf page where dwelling is the point.
const HERO_ROTATION_MS = 12_000;

function libraryHeroUrl(appid: number): string {
  return `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${String(appid)}/library_hero.jpg`;
}

export function Hero({ clips }: HeroProps) {
  // Clips without artwork *or* trailers are useless to a hero. Trailer
  // is preferred but `capsuleImage` is the still-image fallback.
  const playable = useMemo(
    () =>
      clips.filter(
        (c) => c.trailerHls !== null || c.capsuleImage !== null,
      ),
    [clips],
  );

  const [idx, setIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const startedAtRef = useRef(0);

  const advance = useCallback(() => {
    if (playable.length === 0) return;
    setIdx((i) => (i + 1) % playable.length);
  }, [playable.length]);

  // Click anywhere on the Hero unmutes — the TikTok / Reels pattern,
  // matched to /tv. Skip the unmute when the click lands on an actual
  // control so the CTAs, player-count chips, and mute toggle still
  // behave as their own buttons.
  const onHeroClick = (e: MouseEvent<HTMLElement>) => {
    if (!muted) return;
    if (
      e.target instanceof Element &&
      e.target.closest('button, a') !== null
    ) {
      return;
    }
    setMuted(false);
  };

  // Rotation timer driven by rAF so we can also track progress for the
  // bottom progress bar. Cleared and re-armed on every clip change, on
  // pause toggle, or when the playlist length changes. Paused → no rAF
  // → progress freezes at whatever it was. Resume → fresh timer at 0
  // (we don't try to preserve remaining time — the user paused because
  // they were engaged, so giving them another full window when they
  // un-engage is the right behaviour).
  useEffect(() => {
    if (paused || playable.length <= 1) return undefined;
    startedAtRef.current = performance.now();
    setProgress(0);
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - startedAtRef.current;
      const pct = Math.min(1, elapsed / HERO_ROTATION_MS);
      setProgress(pct);
      if (pct >= 1) {
        advance();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [idx, paused, playable.length, advance]);

  // Pre-load the next clip's library_hero so the crossfade is seamless.
  useEffect(() => {
    if (playable.length <= 1) return;
    const next = playable[(idx + 1) % playable.length];
    if (next === undefined) return;
    const img = new Image();
    img.src = libraryHeroUrl(next.appid);
  }, [idx, playable]);

  const current = playable[idx % Math.max(1, playable.length)];

  if (current === undefined) {
    return <HeroFallback />;
  }

  const heroImage = libraryHeroUrl(current.appid);
  const fallbackImage = current.capsuleImage;

  return (
    <Box
      component="section"
      onClick={onHeroClick}
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
        // Small breathing margin so the CRT corners curve against the
        // page bg (the warm-cocoa stage shows in the gaps, like a TV
        // mounted in a wall).
        mx: { xs: 1, md: 2 },
        mt: { xs: 1, md: 2 },
        // CRT-glass corner curve. Matches /tv's borderRadius scale; same
        // documented page-scoped exception to the "barely rounded" rule.
        borderRadius: { xs: '14px', sm: '20px', md: '28px' },
        // Inset glass shadow — dimming where the convex tube bends
        // toward the viewer. Lighter on the Hero than on /tv: the Hero
        // also carries an editorial wash that adds darkening on top.
        boxShadow:
          'inset 0 0 120px 16px rgba(0,0,0,0.32), inset 0 0 12px rgba(0,0,0,0.22)',
        cursor: muted ? 'pointer' : 'auto',
      }}
    >
      {/* SVG filter defs — same chromatic-aberration recipe as /tv.
          Red shifts left, blue shifts right by 2 px, recomposed via
          screen-blend. Applied only to the broadcast layer (image +
          trailer); the overlays and editorial chrome sit in front of
          the glass, not behind it. */}
      <Box
        component="svg"
        aria-hidden
        sx={{
          position: 'absolute',
          width: 0,
          height: 0,
          pointerEvents: 'none',
        }}
      >
        <defs>
          <filter id="hero-rgb" colorInterpolationFilters="sRGB">
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="r"
            />
            <feOffset in="r" dx="-2" dy="0" result="rShift" />
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="g"
            />
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
              result="b"
            />
            <feOffset in="b" dx="2" dy="0" result="bShift" />
            <feBlend in="rShift" in2="g" mode="screen" result="rg" />
            <feBlend in="rg" in2="bShift" mode="screen" />
          </filter>
        </defs>
      </Box>

      {/* Broadcast layer: background image + trailer, both inside the
          chromatic-aberration filter. */}
      <Box
        sx={{ position: 'absolute', inset: 0, filter: 'url(#hero-rgb)' }}
      >
        {/* Background image. Crossfades on every clip change via the key. */}
        <Box
          key={`bg-${String(current.appid)}`}
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
          }}
          style={{
            backgroundImage:
              heroImage !== ''
                ? `url(${heroImage})`
                : fallbackImage !== null
                  ? `url(${fallbackImage})`
                  : undefined,
          }}
        />

        {/* Trailer (autoplays, auto-advances on `ended` and `error`). */}
        {current.trailerHls !== null && (
          <Box
            key={`vid-${String(current.appid)}`}
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
              loop={false}
              muted={muted}
              autoPlay
              objectPosition="center 30%"
              // Respect the pause: if user is hovering / engaged we
              // don't auto-advance, even when the clip naturally ends.
              // They paused; let them sit on the last frame until they
              // move away.
              onEnded={() => {
                if (!paused) advance();
              }}
              onError={advance}
            />
          </Box>
        )}
      </Box>

      {/* CRT scanlines — 1 px dark line every 3 px, drifting downward on
          an 8 s cycle (mimics vertical-sync roll). Lighter than /tv's
          0.18 because the Hero needs trailer content to read brightly
          behind the editorial overlay. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 1px, transparent 1px, transparent 3px)',
          animation: 'hero-scan-drift 8s linear infinite',
          '@keyframes hero-scan-drift': {
            from: { backgroundPosition: '0 0' },
            to: { backgroundPosition: '0 6px' },
          },
          zIndex: 1,
        }}
      />

      {/* Phosphor vignette. Pairs with the inset glass shadow for the
          compounded CRT-bulge feel. Lighter than /tv's vignette because
          the editorial wash below already darkens the bottom-half. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 95% 95% at 50% 50%, transparent 55%, rgba(0,0,0,0.4) 100%)',
          zIndex: 2,
        }}
      />

      {/* Editorial-readability wash on top of the CRT effects: dark
          bottom gradient + warm radial pulled toward the H1 area. The
          CRT vignette darkens uniformly; this wash specifically helps
          the H1/tagline read against trailer footage. */}
      <Box
        aria-hidden
        sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}
        style={{
          background:
            'linear-gradient(180deg, rgba(14, 12, 10, 0.35) 0%, rgba(14, 12, 10, 0.55) 40%, rgba(14, 12, 10, 0.95) 100%), radial-gradient(ellipse 80% 60% at 30% 100%, rgba(255, 209, 102, 0.18) 0%, transparent 60%)',
        }}
      />

      {/* "Tap for sound" — visible while muted. Same top-right corner
          slot as the mute-toggle below; the two states swap in place
          so the audio-control affordance has one consistent spatial
          home. pointer-events:none so the click that's supposed to
          dismiss it bubbles to the Hero's parent click. */}
      {muted && current.trailerHls !== null && (
        <Stack
          direction="row"
          spacing={1}
          aria-hidden
          sx={{
            position: 'absolute',
            top: { xs: 16, md: 24 },
            right: { xs: 16, md: 24 },
            alignItems: 'center',
            paddingInline: { xs: 1.25, md: 1.5 },
            paddingBlock: { xs: 1, md: 1.25 },
            backgroundColor: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(10px)',
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'rgba(245, 237, 224, 0.22)',
            zIndex: 4,
            pointerEvents: 'none',
            animation: 'hero-mute-pulse 2.4s ease-in-out infinite',
            '@keyframes hero-mute-pulse': {
              '0%, 100%': { opacity: 0.8, transform: 'scale(1)' },
              '50%': { opacity: 1, transform: 'scale(1.04)' },
            },
          }}
        >
          <VolumeOffIcon sx={{ fontSize: { xs: 16, md: 18 } }} />
          <Typography
            component="span"
            sx={{
              fontFamily: 'h1.fontFamily',
              fontStyle: 'italic',
              fontWeight: 700,
              letterSpacing: '0.14em',
              fontSize: { xs: 11, md: 12 },
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            Tap for sound
          </Typography>
        </Stack>
      )}

      {/* Mute toggle when audio is on. Small glass button top-right; the
          only way back to silence without leaving the page. Hidden while
          muted because the TAP FOR SOUND pill is the controlling
          affordance during that state. */}
      {!muted && current.trailerHls !== null && (
        <IconButton
          aria-label="Mute"
          onClick={() => {
            setMuted(true);
          }}
          sx={{
            position: 'absolute',
            top: { xs: 16, md: 24 },
            right: { xs: 16, md: 24 },
            width: 40,
            height: 40,
            borderRadius: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(8px)',
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'rgba(245, 237, 224, 0.18)',
            zIndex: 4,
            transition:
              'border-color 160ms ease, color 160ms ease, background-color 160ms ease',
            '&:hover': {
              borderColor: 'primary.main',
              color: 'primary.main',
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
            },
          }}
        >
          <VolumeUpIcon sx={{ fontSize: 20 }} />
        </IconButton>
      )}

      {/* Bottom progress bar — fills as the rotation timer runs.
          Freezes instantly on pause (width transition disabled), eases
          smoothly between rAF ticks when running. The rounded Hero
          corners taper the ends of the bar, which reads as a real
          broadcast-progress indicator rather than a flat ribbon. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 2,
          backgroundColor: 'rgba(245, 237, 224, 0.06)',
          zIndex: 4,
          pointerEvents: 'none',
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

      <Container
        maxWidth="xl"
        sx={{ position: 'relative', zIndex: 3, py: { xs: 6, md: 10 } }}
      >
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

          <PlayerCountSelector />

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
                party: 0,
                pageCount: 1,
              }}
              variant="outlined"
              size="large"
            >
              Browse the catalog
            </ButtonLink>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

function HeroFallback() {
  // Empty playlist (Steam outage). Render the editorial layer without
  // any background imagery so the page still has a brand-voice opener.
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        minHeight: { xs: 460, md: 580 },
        display: 'flex',
        alignItems: 'center',
        mb: { xs: 8, md: 12 },
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="xl">
        <Stack spacing={3} sx={{ maxWidth: 880 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Box
              sx={{ width: 36, height: 1, backgroundColor: 'primary.main' }}
            />
            <Typography
              variant="overline"
              sx={{ color: 'primary.main', fontWeight: 700 }}
            >
              Tonight on Steam
            </Typography>
          </Stack>
          <Typography
            variant="h1"
            component="h1"
            sx={{ fontSize: { xs: 56, sm: 84, md: 110 }, maxWidth: '11ch' }}
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
          <PlayerCountSelector />
        </Stack>
      </Container>
    </Box>
  );
}

/**
 * Hero player-count chips. Each chip deep-links to `/browse?party=N` so the
 * filter has a single owner — the browse-page strip. The home page itself
 * doesn't track a player-count state; the chips are an entry point, not a
 * local filter.
 */
function PlayerCountSelector() {
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
        const label = n === 5 ? '5+' : String(n);
        return (
          <Box
            key={n}
            sx={{
              minWidth: 38,
              height: 36,
              display: 'inline-flex',
              alignItems: 'stretch',
              border: '1px solid',
              borderColor: 'rgba(245, 237, 224, 0.22)',
              transition: 'border-color 160ms ease, background-color 160ms ease',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'rgba(255, 209, 102, 0.06)',
              },
              '&:hover a': {
                color: 'primary.main',
              },
              '&:focus-within': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: 2,
              },
            }}
          >
            <Link
              to="/browse"
              search={{
                mood: 'all',
                sort: 'topsellers',
                specials: false,
                party: n,
                pageCount: 1,
              }}
              aria-label={`Browse ${label}-player couch games`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingInline: 12,
                width: '100%',
                textDecoration: 'none',
                color: 'inherit',
                fontFamily: 'inherit',
                fontWeight: 600,
                fontSize: 15,
                letterSpacing: '0.01em',
                outline: 'none',
              }}
            >
              {label}
            </Link>
          </Box>
        );
      })}
    </Stack>
  );
}
