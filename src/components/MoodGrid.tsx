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
  eyebrow: string;
  title: string;
  blurb: string;
  hint: string;
  icon: ReactNode;
  accent: string;
}

const MOODS: Mood[] = [
  {
    slug: 'party',
    eyebrow: 'A',
    title: 'Loud & silly',
    blurb: 'Easy to learn, impossible to play quietly.',
    hint: '4 friends · 0 manuals',
    icon: <CelebrationIcon sx={{ fontSize: 32 }} />,
    accent: '#ffd166',
  },
  {
    slug: 'brain',
    eyebrow: 'B',
    title: 'Plot, plan, betray',
    blurb: 'For the night someone insists on reading the rulebook.',
    hint: '3–4 schemers',
    icon: <PsychologyIcon sx={{ fontSize: 32 }} />,
    accent: '#7ad6ff',
  },
  {
    slug: 'story',
    eyebrow: 'C',
    title: 'Side-by-side',
    blurb: 'A campaign to share. Save one mid-credits slot for snacks.',
    hint: '2 players · long evening',
    icon: <AutoStoriesIcon sx={{ fontSize: 32 }} />,
    accent: '#a5db5f',
  },
  {
    slug: 'versus',
    eyebrow: 'D',
    title: 'Settle a grudge',
    blurb: 'Fighters, sports, party brawls — somebody has to lose.',
    hint: '2–4 rivals',
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
            Pick a vibe — we&apos;ll narrow it down
          </Typography>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: 40, md: 64 },
              maxWidth: '14ch',
            }}
          >
            What kind of <Box component="em" sx={{ fontStyle: 'italic', color: 'primary.main' }}>night</Box> is it?
          </Typography>
        </Box>
        <Typography
          color="text.secondary"
          sx={{
            fontFamily: 'h1.fontFamily',
            fontStyle: 'italic',
            fontSize: { xs: 16, md: 18 },
            maxWidth: 360,
            lineHeight: 1.4,
          }}
        >
          Four moods, four short lists. Click the one that matches the
          energy at the door and skip the doomscroll.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 1.5, md: 2 },
          gridTemplateColumns: {
            xs: 'repeat(1, 1fr)',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
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
                <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', mb: 4 }}>
                  <Typography
                    sx={{
                      fontFamily: 'h1.fontFamily',
                      fontWeight: 600,
                      fontStyle: 'italic',
                      fontSize: 18,
                      color: mood.accent,
                      lineHeight: 1,
                      mt: 0.5,
                    }}
                  >
                    {mood.eyebrow}
                  </Typography>
                  <Box sx={{ color: mood.accent, opacity: 0.8 }}>{mood.icon}</Box>
                </Stack>

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
