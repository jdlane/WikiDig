/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // The WordNet chunk (~1.7 MB, ~590 KB gzipped) is expected; it loads alongside the article.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    environment: 'jsdom',
  },
});
