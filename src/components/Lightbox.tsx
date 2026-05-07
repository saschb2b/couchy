import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useCallback, useEffect, useRef } from 'react';

export interface LightboxImage {
  id: number;
  path_thumbnail: string;
  path_full: string;
}

interface LightboxProps {
  images: LightboxImage[];
  /** Index of the currently visible image, or `null` when closed. */
  index: number | null;
  /** Called when the viewer should close. */
  onClose: () => void;
  /** Called with the next index the viewer should jump to. */
  onIndexChange: (next: number) => void;
  /** For aria-labels and image alt text. */
  gameName: string;
}

export function Lightbox({
  images,
  index,
  onClose,
  onIndexChange,
  gameName,
}: LightboxProps) {
  const current: LightboxImage | null =
    index !== null ? (images[index] ?? null) : null;
  const open = current !== null;
  const thumbsRef = useRef<HTMLDivElement | null>(null);

  const next = useCallback(() => {
    if (index === null) return;
    onIndexChange((index + 1) % images.length);
  }, [index, images.length, onIndexChange]);

  const prev = useCallback(() => {
    if (index === null) return;
    onIndexChange((index - 1 + images.length) % images.length);
  }, [index, images.length, onIndexChange]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [open, next, prev]);

  // Keep the active thumbnail visible when index changes
  useEffect(() => {
    if (!open || index === null) return;
    const el = thumbsRef.current?.querySelector<HTMLElement>(
      `[data-thumb-index="${String(index)}"]`,
    );
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [open, index]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-label={`${gameName} screenshot viewer`}
      slotProps={{
        backdrop: {
          sx: { backgroundColor: 'rgba(8, 6, 5, 0.94)' },
        },
      }}
      sx={{
        '&:focus-visible': { outline: 'none' },
      }}
    >
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
        }}
        tabIndex={-1}
      >
        {/* Top bar */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: { xs: 2, md: 4 },
            py: 2,
            zIndex: 2,
            background:
              'linear-gradient(180deg, rgba(8, 6, 5, 0.6) 0%, transparent 100%)',
          }}
        >
          {current !== null && (
            <Typography
              variant="overline"
              sx={{ color: 'text.secondary', letterSpacing: '0.2em' }}
            >
              {(index ?? 0) + 1} / {images.length}
            </Typography>
          )}
          <IconButton
            onClick={onClose}
            aria-label="Close viewer"
            sx={{
              color: 'text.primary',
              backgroundColor: 'rgba(245, 237, 224, 0.06)',
              '&:hover': {
                backgroundColor: 'rgba(245, 237, 224, 0.14)',
                color: 'primary.main',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Image stage */}
        <Box
          sx={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // Click on the empty stage = close. Image and chevrons stop propagation.
            cursor: 'zoom-out',
            px: { xs: 1, md: 8 },
          }}
          onClick={onClose}
        >
          {current !== null && (
            <Box
              component="img"
              src={current.path_full}
              alt={`${gameName} screenshot ${(index ?? 0) + 1}`}
              onClick={(e) => {
                e.stopPropagation();
              }}
              sx={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                cursor: 'default',
                userSelect: 'none',
                boxShadow: '0 30px 80px rgba(0, 0, 0, 0.6)',
              }}
            />
          )}

          {images.length > 1 && (
            <>
              <ChevronButton
                ariaLabel="Previous screenshot"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                side="left"
              >
                <ChevronLeftIcon sx={{ fontSize: 32 }} />
              </ChevronButton>
              <ChevronButton
                ariaLabel="Next screenshot"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                side="right"
              >
                <ChevronRightIcon sx={{ fontSize: 32 }} />
              </ChevronButton>
            </>
          )}
        </Box>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <Box
            ref={thumbsRef}
            sx={{
              flex: '0 0 auto',
              display: 'flex',
              gap: 1,
              overflowX: 'auto',
              px: { xs: 2, md: 4 },
              py: 2,
              backgroundColor: 'rgba(8, 6, 5, 0.6)',
              backdropFilter: 'blur(8px)',
              scrollbarWidth: 'thin',
              '&::-webkit-scrollbar': { height: 6 },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(245, 237, 224, 0.18)',
                borderRadius: 3,
              },
            }}
          >
            {images.map((img, i) => {
              const active = i === index;
              return (
                <Box
                  key={img.id}
                  component="button"
                  type="button"
                  data-thumb-index={String(i)}
                  onClick={() => {
                    onIndexChange(i);
                  }}
                  sx={{
                    all: 'unset',
                    cursor: 'pointer',
                    flex: '0 0 auto',
                    width: { xs: 96, md: 128 },
                    aspectRatio: '16 / 9',
                    overflow: 'hidden',
                    border: '2px solid',
                    borderColor: active ? 'primary.main' : 'transparent',
                    opacity: active ? 1 : 0.55,
                    transition: 'opacity 160ms ease, border-color 160ms ease',
                    '&:hover': { opacity: 1 },
                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: 'primary.main',
                      outlineOffset: 2,
                    },
                  }}
                >
                  <Box
                    component="img"
                    src={img.path_thumbnail}
                    alt=""
                    loading="lazy"
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Modal>
  );
}

interface ChevronButtonProps {
  ariaLabel: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  side: 'left' | 'right';
  children: React.ReactNode;
}

function ChevronButton({ ariaLabel, onClick, side, children }: ChevronButtonProps) {
  return (
    <IconButton
      onClick={onClick}
      aria-label={ariaLabel}
      sx={{
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        [side]: { xs: 4, md: 16 },
        width: { xs: 44, md: 56 },
        height: { xs: 44, md: 56 },
        color: 'text.primary',
        backgroundColor: 'rgba(245, 237, 224, 0.06)',
        backdropFilter: 'blur(8px)',
        zIndex: 3,
        transition: 'background-color 160ms ease, color 160ms ease',
        '&:hover': {
          backgroundColor: 'rgba(245, 237, 224, 0.16)',
          color: 'primary.main',
        },
      }}
    >
      {children}
    </IconButton>
  );
}
