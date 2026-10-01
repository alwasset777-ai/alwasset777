import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { API_CHANNELS } from '@alwasset/shared/api/channels';

const allowed = new Set(API_CHANNELS);

/** Seul pont entre l'interface (sans accès à Node) et le processus principal. */
contextBridge.exposeInMainWorld('alwasset', {
  invoke(channel: string, ...args: unknown[]) {
    if (!allowed.has(channel)) return Promise.reject(new Error(`Canal non autorisé : ${channel}`));
    return ipcRenderer.invoke(channel, ...args);
  },
  /** Chemin local d'un fichier glissé-déposé (vide si le fichier ne vient pas du disque). */
  pathForFile(file: File): string {
    return webUtils.getPathForFile(file);
  },
});
