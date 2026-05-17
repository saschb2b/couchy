import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import useMediaQuery from '@mui/material/useMediaQuery';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { Link } from '@tanstack/react-router';
import { TrailerPlayer } from './TrailerPlayer';
import { toggleShortlist } from '../lib/shortlist';
import { useIsInShortlist } from '../lib/useShortlist';
import type { SteamGameSummary } from '../server/steam/types';

type TvClip = SteamGameSummary & { trailerHls: string };

interface TvViewerProps {
  clips: SteamGameSummary[];
}

function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) continue;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

function channelLabel(appid: number): string {
  return `CH ${String(((appid * 37) % 998) + 1).padStart(3, '0')}`;
}

function playerLabel(g: SteamGameSummary): string | null {
  const lp = g.localPlayers;
  if (lp !== null) {
    return lp.min === lp.max
      ? `${String(lp.max)} players`
      : `${String(lp.min)}–${String(lp.max)} players`;
  }
  if (g.maxPlayers !== null) {
    return `Up to ${String(g.maxPlayers)} players`;
  }
  return null;
}

/**
 * The /tv "channel surf" viewer. Shuffles the clip pool on mount and plays
 * trailers back-to-back with a brief static-burst transition between
 * channels. Auto-advances on `ended` (and on `error`, so a single broken
 * trailer doesn't stick). Keyboard: ←/→ to flip channels, M to mute.
 *
 * Retro effects are pure CSS: a repeating-linear-gradient scanline layer,
 * a radial vignette, and an SVG-noise data URI for the static flash.
 * Nothing JS-heavy — the page is meant to be left open in a tab.
 */
export function TvViewer({ clips }: TvViewerProps) {
  const playable = useMemo<TvClip[]>(
    () => clips.filter((c): c is TvClip => c.trailerHls !== null),
    [clips],
  );

  // Portrait-mobile viewport detection. Used to switch the layout from
  // "centered black wrapper around a 16:9 player" to "16:9 player at the
  // top + scroll-friendly content panel below." Avoids the all-too-common
  // tiny-letterboxed-video-on-a-phone problem.
  const isPortraitMobile = useMediaQuery(
    '(max-width: 640px) and (orientation: portrait)',
  );

  const [order, setOrder] = useState<TvClip[]>(playable);
  const [idx, setIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [staticFlash, setStaticFlash] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // The video player only renders post-hydration. SSR returns nothing for
  // the playback area so the unshuffled-first-clip never paints before
  // the shuffle runs.
  const [hydrated, setHydrated] = useState(false);

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screenRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setOrder(shuffle(playable));
    setIdx(0);
    setHydrated(true);
  }, [playable]);

  const current = hydrated ? order[idx] : undefined;
  const saved = useIsInShortlist(current?.appid ?? 0);

  const advance = useCallback(
    (delta: 1 | -1) => {
      if (order.length === 0) return;
      if (flashTimer.current !== null) clearTimeout(flashTimer.current);
      setStaticFlash(true);
      flashTimer.current = setTimeout(() => {
        setIdx((i) => (i + delta + order.length) % order.length);
        setStaticFlash(false);
        flashTimer.current = null;
      }, 280);
    },
    [order.length],
  );

  const next = useCallback(() => {
    advance(1);
  }, [advance]);
  const prev = useCallback(() => {
    advance(-1);
  }, [advance]);

  const bumpControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current !== null) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  // Browser Fullscreen API. We fullscreen the screen container itself
  // (rather than the outer wrapper) so the CRT chrome — rounded corners,
  // inset glass shadow, scanlines, vignette, chromatic-aberration filter
  // — fills the viewport intact. The `:fullscreen` styles below just
  // unclip the maxWidth/maxHeight so the element can actually grow to
  // viewport dimensions.
  //
  // On mobile we also best-effort lock to landscape after entering
  // fullscreen — that's the YouTube pattern (tap fullscreen, phone
  // flips to landscape). Android Chrome / Firefox honour the lock; iOS
  // Safari doesn't expose `screen.orientation.lock` at all so the user
  // has to rotate manually. The defensive try/catch handles both.
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement !== null) {
      void document.exitFullscreen();
      // `unlock` is typed in this project's TS lib; iOS Safari still
      // throws at runtime since it doesn't ship the Screen Orientation
      // API, so wrap in try/catch.
      try {
        window.screen.orientation.unlock();
      } catch {
        /* unsupported — fine. */
      }
      return;
    }
    const el = screenRef.current;
    if (el === null) return;
    el.requestFullscreen()
      .then(() => {
        // `lock` isn't in this project's TS lib (`unlock` is — asymmetric);
        // hand-type the cast and call defensively.
        const orientation = window.screen.orientation as ScreenOrientation & {
          lock(orientation: string): Promise<void>;
        };
        try {
          orientation.lock('landscape').catch(() => undefined);
        } catch {
          /* unsupported (iOS Safari) — user rotates manually. */
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement !== null);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
    };
  }, []);

  useEffect(() => {
    bumpControls();
    return () => {
      if (controlsTimer.current !== null) clearTimeout(controlsTimer.current);
      if (flashTimer.current !== null) clearTimeout(flashTimer.current);
    };
  }, [bumpControls]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
        bumpControls();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
        bumpControls();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setMuted((m) => !m);
        bumpControls();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
        bumpControls();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [next, prev, bumpControls, toggleFullscreen]);

  if (!hydrated) {
    return <TuningIn />;
  }

  if (current === undefined) {
    return <NoSignal />;
  }

  // Single click anywhere on the screen unmutes — the TikTok / Reels
  // pattern, which solves the "user doesn't know they can unmute"
  // discoverability problem. Skip the unmute when the click lands on an
  // actual control so buttons still work as buttons.
  const onScreenClick = (e: React.MouseEvent<HTMLElement>) => {
    if (!muted) return;
    if (
      e.target instanceof Element &&
      e.target.closest('button, a') !== null
    ) {
      return;
    }
    setMuted(false);
  };

  return (
    <Box
      onPointerMove={bumpControls}
      onPointerLeave={() => {
        setShowControls(false);
      }}
      onClick={onScreenClick}
      sx={{
        position: 'relative',
        width: '100%',
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: isPortraitMobile && !isFullscreen ? 'column' : 'row',
        alignItems:
          isPortraitMobile && !isFullscreen ? 'stretch' : 'center',
        justifyContent:
          isPortraitMobile && !isFullscreen ? 'flex-start' : 'center',
        backgroundColor: '#000',
        cursor: muted ? 'pointer' : showControls ? 'auto' : 'none',
        overflow: 'hidden',
      }}
    >
      {/* SVG filter defs — proper per-channel RGB split. Red shifts left,
          blue shifts right, green stays anchored. Composited back with
          screen-blend so each channel adds light independently. The 2 px
          offset is enough to see at the edges and subtle in the centre. */}
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
          <filter id="tv-rgb" colorInterpolationFilters="sRGB">
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

      <Box
        ref={screenRef}
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 1600,
          aspectRatio: '16 / 9',
          maxHeight: 'calc(100vh - 96px)',
          overflow: 'hidden',
          backgroundColor: '#000',
          // CRT-glass corner curve. Documented exception to the "barely
          // rounded everywhere" rule (see DESIGN.md → Surfaces).
          borderRadius: { xs: '14px', sm: '20px', md: '28px' },
          // Inset shadow that darkens the edges, simulating the dimming
          // a real CRT shows where the glass bends toward the viewer.
          // Pairs with the radial vignette below for a compounded effect.
          boxShadow:
            'inset 0 0 140px 24px rgba(0,0,0,0.55), inset 0 0 14px rgba(0,0,0,0.4)',
          // Browser fullscreen: unclip the size caps so the element can
          // grow to viewport dimensions. CRT chrome (rounded corners,
          // glass shadow, scanlines, aberration) is kept intact — the
          // whole tube fills the screen, looking like a CRT in a dark
          // room rather than a flat fullscreen video.
          '&:fullscreen': {
            maxWidth: '100vw',
            maxHeight: '100vh',
            width: '100vw',
            height: '100vh',
          },
        }}
      >
        {/* Video gets the chromatic-aberration filter via its wrapper.
            Overlays (scanlines, vignette, chrome) deliberately do *not*
            get the filter — they're broadcast chrome, not the picture. */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            filter: 'url(#tv-rgb)',
          }}
        >
          <TrailerPlayer
            key={current.appid}
            src={current.trailerHls}
            controls={false}
            muted={muted}
            autoPlay
            onEnded={next}
            onError={next}
          />
        </Box>

        {/* CRT scanlines — 1 px dark line every 3 px. Drifts down slowly
            to mimic a CRT's vertical-sync roll. */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 3px)',
            animation: 'tv-scan-drift 8s linear infinite',
            '@keyframes tv-scan-drift': {
              from: { backgroundPosition: '0 0' },
              to: { backgroundPosition: '0 6px' },
            },
            zIndex: 1,
          }}
        />

        {/* Phosphor vignette. Heavier than the body-wash vignette so the
            CRT corners compound with the inset glass shadow. */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(ellipse 95% 95% at 50% 50%, transparent 45%, rgba(0,0,0,0.65) 100%)',
            zIndex: 2,
          }}
        />

        {/* Station-ID bug (top-left) — the translucent network watermark
            every 90s/2000s cable channel had in the corner. Static, low
            opacity, no background. The in-frame brand identifier; the
            AppBar wordmark is the page-chrome identifier. Offset is
            generous so it clears the CRT-corner curve. */}
        <Typography
          component="span"
          aria-hidden
          sx={{
            position: 'absolute',
            top: { xs: 18, md: 26 },
            left: { xs: 18, md: 28 },
            fontFamily: 'h1.fontFamily',
            fontStyle: 'italic',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            fontSize: { xs: 16, md: 20 },
            color: 'text.primary',
            opacity: 0.55,
            textShadow: '0 1px 8px rgba(0,0,0,0.6)',
            zIndex: 4,
            lineHeight: 1,
          }}
        >
          Couchy
        </Typography>

        {/* Channel readout (top-right) */}
        <Typography
          aria-hidden
          sx={{
            position: 'absolute',
            top: { xs: 18, md: 26 },
            right: { xs: 18, md: 28 },
            fontFamily: 'h1.fontFamily',
            fontStyle: 'italic',
            fontWeight: 700,
            letterSpacing: '0.18em',
            fontSize: { xs: 12, md: 14 },
            color: 'primary.main',
            paddingInline: 1,
            paddingBlock: 0.25,
            backgroundColor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 4,
          }}
        >
          {channelLabel(current.appid)}
        </Typography>

        {/* Lower-third: title + player label always visible, controls
            fade after 3 s idle. Hidden on mobile portrait (non-fullscreen)
            where the external `MobileTvPanel` carries the info + controls
            instead — overlaying a 56-inch lower-third on a 219 px-tall
            phone player would eat the whole picture. */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: { xs: 2, md: 3.5 },
            paddingTop: { xs: 5, md: 8 },
            background:
              'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.8) 100%)',
            zIndex: 4,
            display:
              isPortraitMobile && !isFullscreen ? 'none' : 'block',
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 2, md: 4 }}
            sx={{
              alignItems: { md: 'flex-end' },
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                title={current.name}
                sx={{
                  fontFamily: 'h1.fontFamily',
                  fontStyle: 'italic',
                  fontWeight: 600,
                  fontSize: { xs: 28, md: 56 },
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                  color: 'text.primary',
                  textShadow: '0 2px 16px rgba(0,0,0,0.8)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {current.name}
              </Typography>
              {playerLabel(current) !== null && (
                <Typography
                  sx={{
                    mt: { xs: 0.5, md: 1 },
                    color: 'primary.main',
                    fontFamily: 'h1.fontFamily',
                    fontStyle: 'italic',
                    fontWeight: 700,
                    fontSize: { xs: 14, md: 17 },
                    letterSpacing: '0.02em',
                  }}
                >
                  {playerLabel(current)} on the couch
                </Typography>
              )}
            </Box>

            <Stack
              direction="row"
              spacing={{ xs: 0.75, md: 1.25 }}
              sx={{
                alignItems: 'center',
                opacity: showControls ? 1 : 0,
                transform: showControls ? 'translateY(0)' : 'translateY(8px)',
                transition:
                  'opacity 240ms ease, transform 240ms ease',
                pointerEvents: showControls ? 'auto' : 'none',
              }}
            >
              <CtrlButton aria-label="Previous channel" onClick={prev}>
                <SkipPreviousIcon sx={{ fontSize: 22 }} />
              </CtrlButton>
              <CtrlButton
                aria-label={muted ? 'Unmute' : 'Mute'}
                onClick={() => {
                  setMuted((m) => !m);
                }}
              >
                {muted ? (
                  <VolumeOffIcon sx={{ fontSize: 22 }} />
                ) : (
                  <VolumeUpIcon sx={{ fontSize: 22 }} />
                )}
              </CtrlButton>
              <CtrlButton
                aria-label={saved ? 'Saved to shortlist' : 'Save to shortlist'}
                onClick={() => {
                  toggleShortlist({
                    appid: current.appid,
                    name: current.name,
                    capsuleImage: current.capsuleImage,
                  });
                }}
                emphasized={saved}
              >
                {saved ? (
                  <BookmarkIcon sx={{ fontSize: 22 }} />
                ) : (
                  <BookmarkBorderIcon sx={{ fontSize: 22 }} />
                )}
              </CtrlButton>
              <Link
                to="/game/$appid"
                params={{ appid: String(current.appid) }}
                style={{
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  paddingInline: 14,
                  paddingBlock: 10,
                  border: '1px solid var(--mui-palette-primary-main)',
                  color: 'var(--mui-palette-primary-main)',
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  height: 44,
                  boxSizing: 'border-box',
                }}
              >
                More info
                <OpenInNewIcon sx={{ fontSize: 13 }} />
              </Link>
              <CtrlButton aria-label="Next channel" onClick={next}>
                <SkipNextIcon sx={{ fontSize: 22 }} />
              </CtrlButton>
              <CtrlButton
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <FullscreenExitIcon sx={{ fontSize: 22 }} />
                ) : (
                  <FullscreenIcon sx={{ fontSize: 22 }} />
                )}
              </CtrlButton>
            </Stack>
          </Stack>
        </Box>

        {/* "Tap for sound" affordance — TikTok / Reels pattern. Centered,
            persistent while muted, gentle pulse to catch the eye. Vanishes
            instantly when the user clicks anywhere on the screen
            (handled by the parent's onClick). pointer-events:none so the
            pill doesn't intercept the click that's supposed to dismiss it. */}
        {muted && (
          <Stack
            direction="row"
            spacing={1.25}
            aria-hidden
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              alignItems: 'center',
              paddingInline: { xs: 2, md: 2.5 },
              paddingBlock: { xs: 1.25, md: 1.5 },
              backgroundColor: 'rgba(0, 0, 0, 0.78)',
              backdropFilter: 'blur(10px)',
              color: 'text.primary',
              border: '1px solid',
              borderColor: 'rgba(245, 237, 224, 0.22)',
              zIndex: 4,
              pointerEvents: 'none',
              animation: 'tv-mute-pulse 2.4s ease-in-out infinite',
              '@keyframes tv-mute-pulse': {
                '0%, 100%': { opacity: 0.85, transform: 'translate(-50%, -50%) scale(1)' },
                '50%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1.03)' },
              },
            }}
          >
            <VolumeOffIcon sx={{ fontSize: { xs: 18, md: 22 } }} />
            <Typography
              component="span"
              sx={{
                fontFamily: 'h1.fontFamily',
                fontStyle: 'italic',
                fontWeight: 700,
                letterSpacing: '0.14em',
                fontSize: { xs: 13, md: 16 },
                textTransform: 'uppercase',
                lineHeight: 1,
              }}
            >
              Tap for sound
            </Typography>
          </Stack>
        )}

        {/* Static-burst overlay during channel change. SVG fractal-noise
            data URI, animated with stepped background-position so the
            "snow" jitters. */}
        {staticFlash && (
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 5,
              backgroundColor: '#000',
              backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.65 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
              backgroundSize: '220px 220px',
              animation: 'tv-static-jitter 70ms steps(1) infinite',
              '@keyframes tv-static-jitter': {
                '0%': { backgroundPosition: '0 0' },
                '20%': { backgroundPosition: '14px -10px' },
                '40%': { backgroundPosition: '-6px 18px' },
                '60%': { backgroundPosition: '10px 4px' },
                '80%': { backgroundPosition: '-12px -2px' },
                '100%': { backgroundPosition: '0 0' },
              },
            }}
          />
        )}
      </Box>

      {/* Mobile portrait info + controls panel. Lives below the 16:9
          player as a stacked sibling — always visible (no auto-hide),
          tap-friendly (full-size buttons), no overlay obscuring the
          trailer. Falls away in fullscreen so the landscape-locked
          player owns the screen. */}
      {isPortraitMobile && !isFullscreen && (
        <Stack
          spacing={2}
          sx={{
            flex: 1,
            padding: 2.5,
            backgroundColor: '#000',
            color: 'text.primary',
            // The outer wrapper's onClick handler would otherwise treat
            // any click on the panel as "tap to unmute," which would
            // fight with the panel's own buttons.
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Box>
            <Typography
              sx={{
                fontFamily: 'h1.fontFamily',
                fontStyle: 'italic',
                fontWeight: 600,
                fontSize: 24,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
              }}
            >
              {current.name}
            </Typography>
            {playerLabel(current) !== null && (
              <Typography
                sx={{
                  mt: 0.5,
                  color: 'primary.main',
                  fontFamily: 'h1.fontFamily',
                  fontStyle: 'italic',
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: '0.02em',
                }}
              >
                {playerLabel(current)} on the couch
              </Typography>
            )}
          </Box>

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <CtrlButton aria-label="Previous channel" onClick={prev}>
              <SkipPreviousIcon sx={{ fontSize: 22 }} />
            </CtrlButton>
            <CtrlButton
              aria-label={muted ? 'Unmute' : 'Mute'}
              onClick={() => {
                setMuted((m) => !m);
              }}
            >
              {muted ? (
                <VolumeOffIcon sx={{ fontSize: 22 }} />
              ) : (
                <VolumeUpIcon sx={{ fontSize: 22 }} />
              )}
            </CtrlButton>
            <CtrlButton
              aria-label={saved ? 'Saved to shortlist' : 'Save to shortlist'}
              emphasized={saved}
              onClick={() => {
                toggleShortlist({
                  appid: current.appid,
                  name: current.name,
                  capsuleImage: current.capsuleImage,
                });
              }}
            >
              {saved ? (
                <BookmarkIcon sx={{ fontSize: 22 }} />
              ) : (
                <BookmarkBorderIcon sx={{ fontSize: 22 }} />
              )}
            </CtrlButton>
            <CtrlButton aria-label="Next channel" onClick={next}>
              <SkipNextIcon sx={{ fontSize: 22 }} />
            </CtrlButton>
            <Box sx={{ flex: 1 }} />
            <CtrlButton
              aria-label="Fullscreen (locks to landscape on supported devices)"
              onClick={toggleFullscreen}
              emphasized
            >
              <FullscreenIcon sx={{ fontSize: 22 }} />
            </CtrlButton>
          </Stack>

          <Link
            to="/game/$appid"
            params={{ appid: String(current.appid) }}
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingInline: 14,
              paddingBlock: 12,
              border: '1px solid var(--mui-palette-primary-main)',
              color: 'var(--mui-palette-primary-main)',
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              boxSizing: 'border-box',
            }}
          >
            More info
            <OpenInNewIcon sx={{ fontSize: 14 }} />
          </Link>
        </Stack>
      )}
    </Box>
  );
}

interface CtrlButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  'aria-label': string;
  emphasized?: boolean;
}

function CtrlButton({
  children,
  onClick,
  emphasized = false,
  ...rest
}: CtrlButtonProps) {
  return (
    <IconButton
      onClick={onClick}
      {...rest}
      sx={{
        width: 44,
        height: 44,
        borderRadius: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(6px)',
        color: emphasized ? 'primary.main' : 'text.primary',
        border: '1px solid',
        borderColor: emphasized ? 'primary.main' : 'rgba(245, 237, 224, 0.18)',
        transition:
          'border-color 160ms ease, color 160ms ease, background-color 160ms ease',
        '&:hover': {
          borderColor: 'primary.main',
          color: 'primary.main',
          backgroundColor: 'rgba(0,0,0,0.7)',
        },
      }}
    >
      {children}
    </IconButton>
  );
}

function TuningIn() {
  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
      }}
    >
      <Typography
        sx={{
          fontFamily: 'h1.fontFamily',
          fontStyle: 'italic',
          color: 'primary.main',
          fontSize: { xs: 24, md: 32 },
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}
      >
        Tuning in
      </Typography>
    </Box>
  );
}

function NoSignal() {
  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
        position: 'relative',
        overflow: 'hidden',
        backgroundImage:
          'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px)',
      }}
    >
      <Typography
        sx={{
          fontFamily: 'h1.fontFamily',
          fontStyle: 'italic',
          fontWeight: 700,
          fontSize: { xs: 56, md: 96 },
          letterSpacing: '-0.04em',
          color: '#e0533c',
          textShadow: '0 0 24px rgba(224, 83, 60, 0.4)',
        }}
      >
        NO SIGNAL
      </Typography>
      <Typography
        color="text.secondary"
        sx={{
          fontFamily: 'h1.fontFamily',
          fontStyle: 'italic',
          fontSize: { xs: 16, md: 18 },
          mt: 2,
          maxWidth: 480,
          textAlign: 'center',
        }}
      >
        Steam isn&apos;t picking up. Try again in a minute.
      </Typography>
    </Box>
  );
}
