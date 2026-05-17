import type { CSSProperties, ReactNode } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import ExploreIcon from '@mui/icons-material/Explore';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { Link, useRouterState } from '@tanstack/react-router';
import { useShortlist } from '../lib/useShortlist';

interface AppShellProps {
  children: ReactNode;
}

const TAB_LINK_STYLE: CSSProperties = {
  textDecoration: 'none',
  color: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  height: '100%',
  paddingInline: 14,
};

// Tighter padding so three icon tabs fit comfortably next to the
// wordmark on a 320 px viewport.
const MOBILE_ICON_LINK_STYLE: CSSProperties = {
  textDecoration: 'none',
  color: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  paddingInline: 12,
  minWidth: 44,
};

// Active-state pseudo-element. Single signal — a 2 px amber rule across
// the top of the AppBar above the active tab. Don't pair with a colour
// or weight change on the label: the rule is the encoding, anything else
// is double-encoding (see DESIGN.md → "Less is more").
const activeTabRule = {
  content: '""',
  position: 'absolute',
  top: 0,
  left: 14,
  right: 14,
  height: 2,
  backgroundColor: 'primary.main',
};

export function AppShell({ children }: AppShellProps) {
  const shortlistCount = useShortlist().length;
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isDiscover = pathname === '/';
  const isBrowse = pathname.startsWith('/browse');
  const isSaved = pathname.startsWith('/shortlist');
  const isTv = pathname.startsWith('/tv');
  const isAbout = pathname.startsWith('/about');

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: 'rgba(14, 12, 10, 0.78)',
          backdropFilter: 'blur(14px) saturate(1.2)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ minHeight: 64, gap: { xs: 1, md: 2 } }}>
            <Link
              to="/"
              search={{}}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
              }}
              aria-label="Couchy, home"
            >
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: 'h1.fontFamily',
                    fontWeight: 800,
                    fontStyle: 'italic',
                    letterSpacing: '-0.04em',
                    fontSize: 26,
                    lineHeight: 1,
                  }}
                >
                  Couchy
                </Typography>
                <Box
                  aria-hidden
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: 'primary.main',
                  }}
                />
              </Stack>
            </Link>

            <Box sx={{ flex: 1 }} />

            {/* Mobile primary tabs — icon-only versions of Browse, TV,
                Saved. Discover is reachable by clicking the wordmark, so
                it's omitted here. About stays desktop-only (low-priority
                utility, not worth a phone-viewport slot). */}
            <Stack
              direction="row"
              sx={{
                display: { xs: 'flex', sm: 'none' },
                height: 64,
                gap: 0,
              }}
            >
              <HeaderTab active={isBrowse}>
                <Link
                  to="/browse"
                  search={{
                    mood: 'all',
                    sort: 'topsellers',
                    specials: false,
                    party: 0,
                    pageCount: 1,
                  }}
                  aria-label="Browse"
                  style={MOBILE_ICON_LINK_STYLE}
                >
                  <ExploreIcon sx={{ fontSize: 22 }} />
                </Link>
              </HeaderTab>
              <HeaderTab active={isTv}>
                <Link
                  to="/tv"
                  aria-label="TV"
                  style={MOBILE_ICON_LINK_STYLE}
                >
                  <LiveTvIcon sx={{ fontSize: 22, color: 'primary.main' }} />
                </Link>
              </HeaderTab>
              <HeaderTab active={isSaved}>
                <Link
                  to="/shortlist"
                  aria-label={
                    shortlistCount > 0
                      ? `Saved (${String(shortlistCount)})`
                      : 'Saved'
                  }
                  style={MOBILE_ICON_LINK_STYLE}
                >
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <BookmarkIcon sx={{ fontSize: 22 }} />
                    {shortlistCount > 0 && (
                      <Box
                        component="span"
                        sx={{
                          position: 'absolute',
                          top: -4,
                          right: -8,
                          minWidth: 16,
                          height: 16,
                          paddingInline: 0.5,
                          fontSize: 10,
                          fontWeight: 700,
                          lineHeight: 1,
                          backgroundColor: 'primary.main',
                          color: 'background.default',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {shortlistCount}
                      </Box>
                    )}
                  </Box>
                </Link>
              </HeaderTab>
            </Stack>

            {/* Desktop primary tabs */}
            <Stack
              direction="row"
              sx={{
                display: { xs: 'none', sm: 'flex' },
                height: 64,
                gap: { sm: 0, md: 0.5 },
              }}
            >
              <HeaderTab active={isDiscover}>
                <Link to="/" search={{}} style={TAB_LINK_STYLE}>
                  <TabLabel>Discover</TabLabel>
                </Link>
              </HeaderTab>
              <HeaderTab active={isBrowse}>
                <Link
                  to="/browse"
                  search={{
                    mood: 'all',
                    sort: 'topsellers',
                    specials: false,
                    party: 0,
                    pageCount: 1,
                  }}
                  style={TAB_LINK_STYLE}
                >
                  <TabLabel>Browse</TabLabel>
                </Link>
              </HeaderTab>
              <HeaderTab active={isSaved}>
                <Link to="/shortlist" style={TAB_LINK_STYLE}>
                  <TabLabel>Saved</TabLabel>
                  {shortlistCount > 0 && (
                    <Box
                      component="span"
                      sx={{
                        ml: 1,
                        minWidth: 18,
                        height: 18,
                        px: 0.625,
                        fontSize: 10.5,
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                        backgroundColor: 'primary.main',
                        color: 'background.default',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {shortlistCount}
                    </Box>
                  )}
                </Link>
              </HeaderTab>
              <HeaderTab active={isTv}>
                <Link to="/tv" style={TAB_LINK_STYLE}>
                  {/* Amber LiveTv icon as the only signal that TV is a
                      content destination rather than a peer tab. The
                      colour alone does the work; no pulse, no badge,
                      no second encoding. */}
                  <LiveTvIcon
                    aria-hidden
                    sx={{
                      fontSize: 16,
                      mr: 1,
                      color: 'primary.main',
                      flex: '0 0 auto',
                    }}
                  />
                  <TabLabel>TV</TabLabel>
                </Link>
              </HeaderTab>
            </Stack>

            {/* Secondary: About sits past a vertical hairline at a lower
                visual weight (smaller font, secondary colour) to mark it
                as utility rather than a peer destination. */}
            <Box
              sx={{
                position: 'relative',
                height: 64,
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'stretch',
                pl: { sm: 1, md: 1.5 },
                ml: { sm: 0.5, md: 1 },
                borderLeft: '1px solid',
                borderColor: 'divider',
                '&::before': isAbout ? activeTabRule : undefined,
                '&:hover .about-label': { color: 'text.primary' },
              }}
            >
              <Link to="/about" style={{ ...TAB_LINK_STYLE, paddingInline: 10 }}>
                <Box
                  component="span"
                  className="about-label"
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: 'text.secondary',
                    transition: 'color 160ms ease',
                    lineHeight: 1,
                  }}
                >
                  ABOUT
                </Box>
              </Link>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <Box component="main" sx={{ flex: 1 }}>
        {children}
      </Box>

      <Box
        component="footer"
        sx={{
          mt: { xs: 8, md: 16 },
          py: { xs: 6, md: 10 },
          borderTop: '1px solid',
          borderColor: 'divider',
          background:
            'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(255, 209, 102, 0.05), transparent 70%)',
        }}
      >
        <Container maxWidth="xl">
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 4, md: 8 }}
            sx={{ alignItems: { md: 'flex-end' }, justifyContent: 'space-between' }}
          >
            <Box>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: 56, md: 96 },
                  fontStyle: 'italic',
                  letterSpacing: '-0.04em',
                  lineHeight: 0.9,
                  mb: 2,
                }}
              >
                Couchy.
              </Typography>
              <Typography
                color="text.secondary"
                sx={{
                  fontFamily: 'h1.fontFamily',
                  fontStyle: 'italic',
                  fontSize: 18,
                  maxWidth: 460,
                  lineHeight: 1.4,
                }}
              >
                A guide to playing video games with the people in your
                living room.
              </Typography>
            </Box>
            <Stack spacing={1} sx={{ alignItems: { md: 'flex-end' } }}>
              <Typography variant="overline" color="text.secondary">
                Credits
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Game data, capsules &amp; reviews via the Steam Store.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Not affiliated with Valve. Artwork &copy; respective publishers.
              </Typography>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}

function HeaderTab({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <Box
      sx={{
        position: 'relative',
        height: 64,
        display: 'flex',
        alignItems: 'stretch',
        '&::before': active ? activeTabRule : undefined,
        '&:hover .tab-label': {
          color: 'primary.main',
        },
      }}
    >
      {children}
    </Box>
  );
}

function TabLabel({ children }: { children: ReactNode }) {
  return (
    <Box
      component="span"
      className="tab-label"
      sx={{
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.14em',
        color: 'text.primary',
        textTransform: 'uppercase',
        transition: 'color 160ms ease',
        lineHeight: 1,
      }}
    >
      {children}
    </Box>
  );
}
