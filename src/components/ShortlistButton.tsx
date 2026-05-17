import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import { useIsInShortlist } from '../lib/useShortlist';
import { toggleShortlist } from '../lib/shortlist';

interface ShortlistButtonProps {
  appid: number;
  name: string;
  capsuleImage: string | null;
}

/**
 * Card-corner shortlist control. Two visual modes for the same toggle:
 *
 * - **Not saved.** Hidden by default; the parent card surface reveals it on
 *   hover via the `.shortlist-icon-wrap` CSS hook. Square 32×32 button with
 *   the bookmark-outline icon. Click adds to the shortlist.
 *
 * - **Saved.** Always visible, rendered as a persistent `SAVED` pill (icon +
 *   short label, Fraunces italic on glass). Click removes from the shortlist.
 *
 * Persistent status pills on the artwork corner are a Steam-storefront move:
 * the saved state is information *about the game*, not a hidden control.
 */
export function ShortlistIconButton({ appid, name, capsuleImage }: ShortlistButtonProps) {
  const saved = useIsInShortlist(appid);
  return (
    <Box
      className="shortlist-icon-wrap"
      sx={{
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 2,
        opacity: saved ? 1 : 0,
        transition: 'opacity 200ms ease',
      }}
    >
      {saved ? (
        <Box
          component="button"
          type="button"
          aria-label={`Remove ${name} from shortlist`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleShortlist({ appid, name, capsuleImage });
          }}
          sx={{
            all: 'unset',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.625,
            paddingInline: 1,
            paddingBlock: 0.5,
            backgroundColor: 'rgba(8, 6, 5, 0.72)',
            backdropFilter: 'blur(8px)',
            color: 'primary.main',
            transition: 'background-color 160ms ease',
            '&:hover': {
              backgroundColor: 'rgba(8, 6, 5, 0.88)',
            },
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: 2,
            },
          }}
        >
          <BookmarkIcon sx={{ fontSize: 14 }} />
          <Typography
            component="span"
            sx={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.08em',
              lineHeight: 1,
            }}
          >
            SAVED
          </Typography>
        </Box>
      ) : (
        <IconButton
          size="small"
          aria-label={`Save ${name} to shortlist`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleShortlist({ appid, name, capsuleImage });
          }}
          sx={{
            width: 32,
            height: 32,
            color: 'common.white',
            backgroundColor: 'rgba(8, 6, 5, 0.65)',
            backdropFilter: 'blur(6px)',
            '&:hover': {
              backgroundColor: 'rgba(8, 6, 5, 0.85)',
              color: 'primary.main',
            },
          }}
        >
          <BookmarkBorderIcon sx={{ fontSize: 18 }} />
        </IconButton>
      )}
    </Box>
  );
}

/** Full-width labelled toggle for the detail-page sidebar. */
export function ShortlistTextButton({ appid, name, capsuleImage }: ShortlistButtonProps) {
  const saved = useIsInShortlist(appid);
  return (
    <Button
      variant="outlined"
      fullWidth
      size="large"
      onClick={() => {
        toggleShortlist({ appid, name, capsuleImage });
      }}
      startIcon={saved ? <BookmarkIcon /> : <BookmarkBorderIcon />}
      sx={{
        borderColor: saved ? 'primary.main' : 'divider',
        color: saved ? 'primary.main' : 'text.primary',
        '&:hover': {
          borderColor: 'primary.main',
          color: 'primary.main',
          background: 'rgba(255, 209, 102, 0.06)',
        },
      }}
    >
      {saved ? 'Saved to shortlist' : 'Save to shortlist'}
    </Button>
  );
}
