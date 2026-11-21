import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves the app from /tradelog/; locally it runs from /.
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    css: false
  }
});
