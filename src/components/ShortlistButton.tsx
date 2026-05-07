import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import { useIsInShortlist } from '../lib/useShortlist';
import { toggleShortlist } from '../lib/shortlist';

interface ShortlistButtonProps {
  appid: number;
  name: string;
  capsuleImage: string | null;
}

/** Compact icon-only toggle for game cards. Visible on hover, latched-on when saved. */
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
      <IconButton
        size="small"
        aria-label={saved ? `Remove ${name} from shortlist` : `Save ${name} to shortlist`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleShortlist({ appid, name, capsuleImage });
        }}
        sx={{
          width: 32,
          height: 32,
          color: saved ? 'primary.main' : 'common.white',
          backgroundColor: 'rgba(8, 6, 5, 0.65)',
          backdropFilter: 'blur(6px)',
          '&:hover': {
            backgroundColor: 'rgba(8, 6, 5, 0.85)',
            color: 'primary.main',
          },
        }}
      >
        {saved ? (
          <BookmarkIcon sx={{ fontSize: 18 }} />
        ) : (
          <BookmarkBorderIcon sx={{ fontSize: 18 }} />
        )}
      </IconButton>
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
