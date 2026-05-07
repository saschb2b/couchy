import type { ReactNode } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import { Link } from '@tanstack/react-router';
import { ButtonLink } from './RouterLinks';
import { useShortlist } from '../lib/useShortlist';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const shortlistCount = useShortlist().length;
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
          <Toolbar disableGutters sx={{ gap: 2, minHeight: 64 }}>
            <Link
              to="/"
              style={{ textDecoration: 'none', color: 'inherit' }}
              aria-label="Couchy, home"
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'baseline' }}>
                <Typography
                  variant="h5"
                  component="span"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    fontStyle: 'italic',
                    fontSize: 26,
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
                    alignSelf: 'center',
                  }}
                />
                <Typography
                  variant="overline"
                  sx={{
                    color: 'text.secondary',
                    display: { xs: 'none', sm: 'inline' },
                  }}
                >
                  Steam couch picks
                </Typography>
              </Stack>
            </Link>
            <Box sx={{ flex: 1 }} />
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            >
              <ButtonLink to="/" variant="text" color="inherit">
                Discover
              </ButtonLink>
              <ButtonLink
                to="/browse"
                search={{
                  mood: 'all',
                  sort: 'topsellers',
                  specials: false,
                  pageCount: 1,
                }}
                variant="text"
                color="inherit"
              >
                Browse
              </ButtonLink>
              <ButtonLink
                to="/shortlist"
                variant="text"
                color="inherit"
                sx={{
                  // Badge with count, only when something is saved.
                  '& .shortlist-badge': {
                    ml: 0.75,
                    minWidth: 22,
                    height: 22,
                    px: 0.75,
                    fontSize: 12,
                    fontWeight: 700,
                    backgroundColor: 'primary.main',
                    color: 'background.default',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                }}
              >
                Saved
                {shortlistCount > 0 && (
                  <Box component="span" className="shortlist-badge">
                    {shortlistCount}
                  </Box>
                )}
              </ButtonLink>
              <ButtonLink to="/about" variant="text" color="inherit">
                About
              </ButtonLink>
            </Stack>
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
