import Box from '@mui/material/Box';
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
  hint: string;
  icon: ReactNode;
  accent: string;
}

const MOODS: Mood[] = [
  {
    slug: 'party',
    title: 'Loud & silly',
    blurb: 'Easy to learn, impossible to play quietly.',
    hint: 'Party-friendly',
    icon: <CelebrationIcon sx={{ fontSize: 32 }} />,
    accent: '#ffd166',
  },
  {
    slug: 'brain',
    title: 'Plan & betray',
    blurb: 'For nights where someone insists on reading the rulebook.',
    hint: 'Strategy & co-op planning',
    icon: <PsychologyIcon sx={{ fontSize: 32 }} />,
    accent: '#7ad6ff',
  },
  {
    slug: 'story',
    title: 'Co-op story',
    blurb: 'A campaign you play through together.',
    hint: 'Story campaigns',
    icon: <AutoStoriesIcon sx={{ fontSize: 32 }} />,
    accent: '#a5db5f',
  },
  {
    slug: 'versus',
    title: 'Versus',
    blurb: 'Brawlers and party fighters. Somebody has to lose.',
    hint: 'Versus & brawlers',
    icon: <SportsKabaddiIcon sx={{ fontSize: 32 }} />,
    accent: '#e0533c',
  },
];

export function MoodGrid() {
  return (
    <Box component="section" sx={{ mb: { xs: 8, md: 12 } }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 2, md: 6 }}
        sx={{ mb: { xs: 4, md: 6 }, alignItems: { md: 'flex-end' } }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="overline"
            sx={{ color: 'primary.main', display: 'block', mb: 1 }}
          >
            By mood
          </Typography>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: 40, md: 64 },
              maxWidth: '14ch',
            }}
          >
            What kind of night is it?
          </Typography>
        </Box>
        <Typography
          color="text.secondary"
          sx={{
            fontFamily: 'h1.fontFamily',
            fontStyle: 'italic',
            fontSize: { xs: 16, md: 18 },
            maxWidth: 340,
            lineHeight: 1.4,
          }}
        >
          Four short lists, sorted by the energy at the door.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 1.5, md: 2 },
          gridTemplateColumns: {
            xs: 'repeat(1, minmax(0, 1fr))',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))',
          },
        }}
      >
        {MOODS.map((mood) => (
          <Box
            key={mood.slug}
            sx={{
              position: 'relative',
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              transition: 'border-color 200ms ease, transform 200ms ease',
              '&:hover': {
                borderColor: mood.accent,
                transform: 'translateY(-2px)',
              },
              '&:hover .mood-rule': {
                width: '100%',
                background: mood.accent,
              },
            }}
          >
            <CardActionAreaLink
              to="/browse"
              search={{
                mood: mood.slug,
                sort: 'topsellers',
                specials: false,
                party: 0,
                pageCount: 1,
              }}
              sx={{
                display: 'block',
                p: { xs: 3, md: 4 },
                minHeight: { xs: 200, md: 280 },
                position: 'relative',
                color: 'inherit',
              }}
            >
              <Stack
                spacing={0}
                sx={{
                  height: '100%',
                  justifyContent: 'space-between',
                  position: 'relative',
                }}
              >
                <Box sx={{ color: mood.accent, opacity: 0.85, mb: 4 }}>
                  {mood.icon}
                </Box>

                <Box>
                  <Typography
                    variant="h4"
                    component="span"
                    sx={{
                      display: 'block',
                      mb: 1.5,
                      fontSize: { xs: 26, md: 30 },
                      lineHeight: 1.05,
                    }}
                  >
                    {mood.title}
                  </Typography>
                  <Typography
                    color="text.secondary"
                    sx={{
                      fontSize: 14,
                      mb: 2,
                      lineHeight: 1.5,
                    }}
                  >
                    {mood.blurb}
                  </Typography>
                  <Box
                    className="mood-rule"
                    sx={{
                      width: 40,
                      height: 1,
                      background: 'rgba(245, 237, 224, 0.18)',
                      mb: 1.5,
                      transition: 'width 280ms ease, background 280ms ease',
                    }}
                  />
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ display: 'block', fontSize: 10 }}
                  >
                    {mood.hint}
                  </Typography>
                </Box>
              </Stack>
            </CardActionAreaLink>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
