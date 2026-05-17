import Box from '@mui/material/Box';
import { useEffect, useRef } from 'react';

interface TrailerPlayerProps {
  /** Steam HLS playlist URL (`hls_h264` from the appdetails movies array). */
  src: string;
  /** Poster image URL. Optional for inline cards that already render the capsule. */
  poster?: string;
  /** Show native player controls. Default `true` for the detail page. */
  controls?: boolean;
  /** Loop playback. Default `false`. */
  loop?: boolean;
  /** Start muted. Default `false`. */
  muted?: boolean;
  /** Start playing on mount. Default `false`. */
  autoPlay?: boolean;
  /** CSS `object-position`. Default `'center'`. */
  objectPosition?: string;
  /** Fires when the underlying `<video>` reaches its end. */
  onEnded?: () => void;
  /** Fires on a playback or HLS-load error. */
  onError?: () => void;
}

/**
 * Steam's current trailer schema returns HLS playlists (.m3u8). Safari plays
 * those natively; everywhere else needs Media Source Extensions plumbing.
 * We dynamic-import hls.js so the ~30 KB player code only ships when somebody
 * actually opens a detail page or hovers a rail card.
 */
export function TrailerPlayer({
  src,
  poster,
  controls = true,
  loop = false,
  muted = false,
  autoPlay = false,
  objectPosition = 'center',
  onEnded,
  onError,
}: TrailerPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video === null) return undefined;

    // Safari (and iOS) plays HLS natively — no JS needed.
    if (video.canPlayType('application/vnd.apple.mpegurl') !== '') {
      video.src = src;
      return undefined;
    }

    // Everywhere else: lazy-load hls.js the first time a trailer mounts.
    const teardown = { hls: null as { destroy: () => void } | null, cancelled: false };
    void (async () => {
      const mod = await import('hls.js');
      const Hls = mod.default;
      if (teardown.cancelled || !Hls.isSupported()) {
        if (!Hls.isSupported() && onError) onError();
        return;
      }
      const hls = new Hls();
      hls.on(Hls.Events.ERROR, (_e, data) => {
        // Only surface fatal errors to the parent; non-fatal stalls
        // recover on their own.
        if (data.fatal && onError) onError();
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      teardown.hls = hls;
    })();

    return () => {
      teardown.cancelled = true;
      teardown.hls?.destroy();
    };
    // onError intentionally not a dep — it's a stable callback in practice and
    // re-running this effect on a new error handler would tear down hls.js.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <Box
      component="video"
      ref={videoRef}
      controls={controls}
      loop={loop}
      muted={muted}
      autoPlay={autoPlay}
      preload="metadata"
      playsInline
      poster={poster}
      onEnded={onEnded}
      onError={onError}
      sx={{
        width: '100%',
        height: '100%',
        display: 'block',
        objectFit: 'cover',
        objectPosition,
        backgroundColor: '#000',
      }}
    />
  );
}
