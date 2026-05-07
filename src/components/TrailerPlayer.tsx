import Box from '@mui/material/Box';
import { useEffect, useRef } from 'react';

interface TrailerPlayerProps {
  /** Steam HLS playlist URL (`hls_h264` from the appdetails movies array). */
  src: string;
  /** Poster image URL. */
  poster: string;
}

/**
 * Steam's current trailer schema returns HLS playlists (.m3u8). Safari plays
 * those natively; everywhere else needs Media Source Extensions plumbing.
 * We dynamic-import hls.js so the ~30 KB player code only ships when somebody
 * actually opens a detail page with a trailer.
 */
export function TrailerPlayer({ src, poster }: TrailerPlayerProps) {
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
      if (teardown.cancelled || !Hls.isSupported()) return;
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      teardown.hls = hls;
    })();

    return () => {
      teardown.cancelled = true;
      teardown.hls?.destroy();
    };
  }, [src]);

  return (
    <Box
      component="video"
      ref={videoRef}
      controls
      preload="metadata"
      playsInline
      poster={poster}
      sx={{
        width: '100%',
        height: '100%',
        display: 'block',
        objectFit: 'cover',
        backgroundColor: '#000',
      }}
    />
  );
}
