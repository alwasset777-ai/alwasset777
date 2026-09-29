import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// La PWA est servie par le Mac sous /m/ (et plus tard par un domaine HTTPS).
export default defineConfig({
  base: '/m/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    // En dev, les appels /api sont relayés vers le Mac (npm run dev côté desktop).
    proxy: { '/api': 'http://localhost:47777' },
  },
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2022' },
});
