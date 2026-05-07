import type { ReactNode } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import { Link } from '@tanstack/react-router';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { ButtonLink } from './RouterLinks';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(16,19,26,0.7)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ gap: 2 }}>
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <SportsEsportsIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" component="span" sx={{ fontWeight: 800 }}>
                  Couchy
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Steam couch picks
                </Typography>
              </Stack>
            </Link>
            <Box sx={{ flex: 1 }} />
            <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', sm: 'flex' } }}>
              <ButtonLink to="/" color="inherit">
                Discover
              </ButtonLink>
              <ButtonLink
                to="/browse"
                search={{ mood: 'all', sort: 'topsellers', specials: false, pageCount: 1 }}
                color="inherit"
              >
                Browse
              </ButtonLink>
              <ButtonLink to="/about" color="inherit">
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
          mt: 8,
          py: 4,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="xl">
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Couchy — a fan-made discovery page. Not affiliated with Valve.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Game data via Steam Store. All artwork &copy; respective publishers.
            </Typography>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
