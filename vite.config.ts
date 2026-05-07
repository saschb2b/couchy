import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '~': path.resolve(import.meta.dirname, './src'),
    },
  },
  plugins: [
    tanstackStart(),
    viteReact(),
  ],
});
