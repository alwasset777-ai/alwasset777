import { contextBridge, ipcRenderer } from 'electron';
import { API_CHANNELS } from '@alwasset/shared/api/channels';

const allowed = new Set(API_CHANNELS);

/** Seul pont entre l'interface (sans accès à Node) et le processus principal. */
contextBridge.exposeInMainWorld('alwasset', {
  invoke(channel: string, ...args: unknown[]) {
    if (!allowed.has(channel)) return Promise.reject(new Error(`Canal non autorisé : ${channel}`));
    return ipcRenderer.invoke(channel, ...args);
  },
});
