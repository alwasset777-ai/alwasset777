import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// La PWA est servie par le Mac sous /m/ (et plus tard par un domaine HTTPS).
export default defineConfig(({ mode }) => ({
  // Démo web autonome (npm run build:demo) servie à la racine d'un domaine.
  base: mode === 'demo' ? '/' : '/m/',
  define: mode === 'demo' ? { 'import.meta.env.VITE_DEMO': JSON.stringify('1') } : {},
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    // En dev, les appels /api sont relayés vers le Mac (npm run dev côté desktop).
    proxy: { '/api': 'http://localhost:47777' },
  },
  build: { outDir: mode === 'demo' ? 'dist-demo' : 'dist', emptyOutDir: true, target: 'es2022' },
}));
