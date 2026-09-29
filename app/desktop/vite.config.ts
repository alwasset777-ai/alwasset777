import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Interface de bureau : chargée en file:// en production, d'où base './'.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true, target: 'chrome130' },
});
