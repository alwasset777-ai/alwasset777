import { ipcMain } from 'electron';
import type { AppApi } from '@alwasset/shared/api/contract';
import type { Hub } from './hub';

type Handlers = { [K in Exclude<keyof AppApi, 'platform'>]: { [M in keyof AppApi[K]]: (...args: never[]) => unknown } };

/** Relie chaque canal IPC de la liste blanche à la méthode du Hub. */
export function registerIpc(hub: Hub): void {
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
    properties: { list: (f) => hub.listProperties(f) },
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
      ipcMain.handle(`api:${ns}.${name}`, (_event, ...args: unknown[]) => (fn as (...a: unknown[]) => unknown)(...args));
    }
  }
}
