import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    dark: true,
    light: true,
  },
  palette: {
    mode: 'dark',
    primary: { main: '#ff7a59' },
    secondary: { main: '#7ad6ff' },
    background: {
      default: '#10131a',
      paper: '#171b25',
    },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily:
      '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontWeight: 800, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.01em' },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 999 } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});
