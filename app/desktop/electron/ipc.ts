import { copyFileSync, existsSync, linkSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BrowserWindow, dialog, ipcMain, shell } from 'electron';
import type { IpcMethods } from '@alwasset/shared/api/channels';
import type { Hub } from './hub';

type Fn = (...args: never[]) => unknown;
type Handlers = { [K in keyof IpcMethods]: { [M in IpcMethods[K][number]]: Fn } };

const PICK_FILTERS = [
  { name: 'Photos, vidéos, documents', extensions: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'gif', 'mp4', 'mov', 'm4v', 'webm', 'pdf', 'doc', 'docx', 'xls', 'xlsx'] },
  { name: 'Tous les fichiers', extensions: ['*'] },
];

/** Relie chaque canal IPC de la liste blanche à la méthode du Hub. */
export function registerIpc(hub: Hub): void {
  let currentSender: Electron.WebContents | null = null;

  const handlers: Handlers = {
    app: { needsSetup: () => hub.needsSetup(), setup: (i) => hub.setup(i), info: () => hub.info() },
    auth: {
      current: () => hub.current(),
      login: (u, p) => hub.login(u, p),
      logout: () => hub.logout(),
      changePassword: (o, n) => hub.changePassword(o, n),
      setLanguage: (l) => hub.setLanguage(l),
    },
    dashboard: { kpis: () => hub.kpis() },
    properties: {
      list: (f) => hub.listProperties(f),
      get: (id) => hub.getProperty(id),
      create: (i) => hub.createProperty(i),
      update: (id, i) => hub.updateProperty(id, i),
      setStatus: (id, s) => hub.setPropertyStatus(id, s),
      remove: (id) => hub.removeProperty(id),
      cities: () => hub.cities(),
      setOwners: (id, o) => hub.setOwners(id, o),
    },
    persons: { search: (q) => hub.searchPersons(q) },
    customFields: {
      list: (e) => hub.listCustomFields(e),
      save: (d) => hub.saveCustomField(d),
      remove: (id) => hub.removeCustomField(id),
    },
    media: {
      list: (e, id) => hub.listMedia(e, id),
      remove: (id) => hub.removeMedia(id),
      reorder: (e, id, ids) => hub.reorderMedia(e, id, ids),
      importPaths: (e: string, id: string, paths: unknown) => {
        if (!Array.isArray(paths) || !paths.every((p) => typeof p === 'string')) throw new Error('Chemins invalides');
        return hub.importMediaPaths(e, id, paths as string[]);
      },
      pick: async (e: string, id: string) => {
        const win = currentSender ? BrowserWindow.fromWebContents(currentSender) : null;
        const opts: Electron.OpenDialogOptions = { properties: ['openFile', 'multiSelections'], filters: PICK_FILTERS };
        const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts);
        if (res.canceled || res.filePaths.length === 0) return hub.listMedia(e, id);
        return hub.importMediaPaths(e, id, res.filePaths);
      },
      open: async (id: string) => {
        // Le fichier stocké n'a pas d'extension : on expose une copie nommée
        // (lien physique si possible) pour que macOS choisisse la bonne application.
        const { path, name } = hub.mediaFile(id);
        const dir = join(tmpdir(), 'alwasset-open', id);
        mkdirSync(dir, { recursive: true });
        const target = join(dir, name);
        if (!existsSync(target)) {
          try {
            linkSync(path, target);
          } catch {
            copyFileSync(path, target);
          }
        }
        const err = await shell.openPath(target);
        if (err) throw new Error(err);
      },
    },
    users: { list: () => hub.listUsers() },
    devices: {
      list: () => hub.listDevices(),
      createPairing: (u, a) => hub.createPairing(u, a),
      revoke: (id) => hub.revokeDevice(id),
    },
    sync: { status: () => hub.syncStatus(), now: () => hub.syncStatus() },
  };

  for (const [ns, methods] of Object.entries(handlers)) {
    for (const [name, fn] of Object.entries(methods)) {
      ipcMain.handle(`api:${ns}.${name}`, (event, ...args: unknown[]) => {
        currentSender = event.sender;
        return (fn as (...a: unknown[]) => unknown)(...args);
      });
    }
  }
}
