import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CelebrationIcon from '@mui/icons-material/Celebration';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi';
import type { ReactNode } from 'react';
import { CardActionAreaLink } from './RouterLinks';

interface Mood {
  slug: 'party' | 'brain' | 'story' | 'versus';
  title: string;
  blurb: string;
  icon: ReactNode;
  gradient: string;
}

const MOODS: Mood[] = [
  {
    slug: 'party',
    title: 'Party chaos',
    blurb: 'Easy to learn, loud to play. Drinks optional.',
    icon: <CelebrationIcon fontSize="large" />,
    gradient: 'linear-gradient(135deg, #ff7a59 0%, #ffb347 100%)',
  },
  {
    slug: 'brain',
    title: 'Brain & strategy',
    blurb: 'Plot, plan, betray. The slow-burn night.',
    icon: <PsychologyIcon fontSize="large" />,
    gradient: 'linear-gradient(135deg, #7ad6ff 0%, #6f7eff 100%)',
  },
  {
    slug: 'story',
    title: 'Co-op story',
    blurb: 'Tackle a campaign side-by-side.',
    icon: <AutoStoriesIcon fontSize="large" />,
    gradient: 'linear-gradient(135deg, #6fffba 0%, #2bb673 100%)',
  },
  {
    slug: 'versus',
    title: 'Versus & brawlers',
    blurb: 'Settle the rivalry, one round at a time.',
    icon: <SportsKabaddiIcon fontSize="large" />,
    gradient: 'linear-gradient(135deg, #ff7eb3 0%, #b86bff 100%)',
  },
];

export function MoodGrid() {
  return (
    <Box sx={{ mb: 6 }}>
      <Typography variant="h5" component="h2" sx={{ fontWeight: 800, mb: 1 }}>
        What kind of night is it?
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Pick a vibe and we'll narrow the catalog.
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: 'repeat(1, 1fr)',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
        }}
      >
        {MOODS.map((mood) => (
          <Card
            key={mood.slug}
            sx={{
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <CardActionAreaLink
              to="/browse"
              search={{ mood: mood.slug, sort: 'topsellers', specials: false, pageCount: 1 }}
              sx={{ p: 3, minHeight: 160 }}
            >
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: mood.gradient,
                  opacity: 0.18,
                }}
              />
              <Stack spacing={1.5} sx={{ position: 'relative' }}>
                <Box sx={{ color: 'primary.main' }}>{mood.icon}</Box>
                <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
                  {mood.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {mood.blurb}
                </Typography>
              </Stack>
            </CardActionAreaLink>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
