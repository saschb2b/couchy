import { createTheme } from '@mui/material/styles';

const COUCH_AMBER = '#ffd166';
const COUCH_AMBER_DEEP = '#f5a623';
const SALE_RED = '#e0533c';
const BG_BASE = '#0e0c0a';
const BG_PAPER = '#15110d';
const TEXT_PRIMARY = '#f5ede0';
const TEXT_SECONDARY = '#9c907e';
const HAIRLINE = 'rgba(245, 237, 224, 0.08)';

const DISPLAY_STACK =
  '"Fraunces", "Times New Roman", Georgia, serif';
const BODY_STACK =
  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    dark: true,
  },
  palette: {
    mode: 'dark',
    primary: { main: COUCH_AMBER, contrastText: BG_BASE },
    secondary: { main: SALE_RED, contrastText: BG_BASE },
    background: {
      default: BG_BASE,
      paper: BG_PAPER,
    },
    text: {
      primary: TEXT_PRIMARY,
      secondary: TEXT_SECONDARY,
    },
    divider: HAIRLINE,
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: BODY_STACK,
    h1: {
      fontFamily: DISPLAY_STACK,
      fontWeight: 600,
      letterSpacing: '-0.04em',
      lineHeight: 0.95,
    },
    h2: {
      fontFamily: DISPLAY_STACK,
      fontWeight: 600,
      letterSpacing: '-0.035em',
      lineHeight: 0.98,
    },
    h3: {
      fontFamily: DISPLAY_STACK,
      fontWeight: 600,
      letterSpacing: '-0.03em',
      lineHeight: 1,
    },
    h4: {
      fontFamily: DISPLAY_STACK,
      fontWeight: 500,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontFamily: DISPLAY_STACK,
      fontWeight: 500,
      letterSpacing: '-0.015em',
    },
    h6: {
      fontWeight: 700,
      letterSpacing: '-0.005em',
    },
    overline: {
      fontFamily: BODY_STACK,
      fontWeight: 600,
      letterSpacing: '0.18em',
      fontSize: 11,
    },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: '-0.005em' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          // Subtle film grain — keeps the page from feeling like a Figma export.
          backgroundImage: `
            radial-gradient(1200px 600px at 80% -10%, rgba(255, 209, 102, 0.07), transparent 60%),
            radial-gradient(900px 500px at -10% 110%, rgba(224, 83, 60, 0.05), transparent 60%),
            url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")
          `,
          backgroundAttachment: 'fixed, fixed, fixed',
        },
        '::selection': {
          background: COUCH_AMBER,
          color: BG_BASE,
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: false },
      styleOverrides: {
        root: {
          borderRadius: 2,
          paddingInline: 18,
          paddingBlock: 10,
          fontWeight: 600,
        },
        sizeLarge: {
          paddingInline: 26,
          paddingBlock: 14,
          fontSize: 15,
        },
        contained: {
          '&.MuiButton-colorPrimary': {
            background: COUCH_AMBER,
            color: BG_BASE,
            '&:hover': { background: COUCH_AMBER_DEEP },
          },
        },
        outlined: {
          borderColor: HAIRLINE,
          color: TEXT_PRIMARY,
          '&:hover': {
            borderColor: COUCH_AMBER,
            background: 'rgba(255, 209, 102, 0.06)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 2,
          letterSpacing: '0.01em',
        },
        sizeSmall: { height: 22 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'transparent',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});
