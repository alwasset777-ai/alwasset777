// Compile le processus principal et le preload d'Electron en CommonJS.
import { build } from 'esbuild';

const prod = process.argv.includes('--prod');
const common = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  sourcemap: prod ? false : 'inline',
  minify: prod,
  // Module natif et Electron restent externes (rebuild par electron-builder).
  external: ['electron', 'better-sqlite3-multiple-ciphers'],
  logLevel: 'info',
};

await build({ ...common, entryPoints: ['electron/main.ts'], outfile: 'dist-electron/main.cjs' });
await build({ ...common, entryPoints: ['electron/preload.ts'], outfile: 'dist-electron/preload.cjs' });
