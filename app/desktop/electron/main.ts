import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { app, BrowserWindow, dialog, shell } from 'electron';
import { Hub } from './hub';
import { registerIpc } from './ipc';
import { DEFAULT_LAN_PORT, startLanServer, type LanServer } from './lan-server';
import { lanAddresses } from './network';
import { openDatabase } from './database';

const DEV_URL = process.env.VITE_DEV_SERVER_URL;
let lan: LanServer | null = null;
let closeDb: (() => void) | null = null;

function mobileDir(): string | null {
  const candidates = app.isPackaged
    ? [join(process.resourcesPath, 'mobile')]
    : [join(__dirname, '../../mobile/dist')];
  return candidates.find((d) => existsSync(join(d, 'index.html'))) ?? null;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'Al Wasset 777',
    backgroundColor: '#ffffff',
    show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  win.once('ready-to-show', () => win.show());
  // Les liens externes s'ouvrent dans le navigateur, jamais dans l'application.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!DEV_URL || !url.startsWith(DEV_URL)) e.preventDefault();
  });
  if (DEV_URL) void win.loadURL(DEV_URL);
  else void win.loadFile(join(__dirname, '../dist/index.html'));
}

async function bootstrap() {
  const { driver, close } = openDatabase(join(app.getPath('userData'), 'data'));
  closeDb = close;
  const hub = new Hub(driver, {
    version: app.getVersion(),
    lanAddresses,
    lanPort: () => lan?.port ?? null,
  });
  registerIpc(hub);
  try {
    lan = await startLanServer(hub, { port: DEFAULT_LAN_PORT, mobileDir: mobileDir() });
  } catch (err) {
    // Port occupé ou réseau refusé : l'application reste utilisable hors synchro.
    console.error('[lan] démarrage impossible', err);
  }
  createWindow();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(bootstrap).catch((err: unknown) => {
    console.error('[main] démarrage impossible', err);
    dialog.showErrorBox('Al Wasset 777', `Démarrage impossible :\n${err instanceof Error ? err.message : String(err)}`);
    app.quit();
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && closeDb) createWindow();
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('will-quit', () => {
    void lan?.close();
    closeDb?.();
  });
}
