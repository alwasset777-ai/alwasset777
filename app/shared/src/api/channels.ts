import type { AppApi } from './contract';

/**
 * Liste blanche des méthodes exposées par le processus principal via IPC.
 * Le preload n'autorise que ces canaux. `media.add` et `media.src` sont
 * implémentés côté interface (fichiers locaux, protocole alw-media://) et
 * s'appuient sur les canaux `media.pick` / `media.importPaths`.
 */
export const API_METHODS = {
  app: ['needsSetup', 'setup', 'info'],
  auth: ['current', 'login', 'logout', 'changePassword', 'setLanguage'],
  dashboard: ['kpis'],
  properties: ['list', 'get', 'create', 'update', 'setStatus', 'remove', 'cities', 'setOwners'],
  persons: ['search'],
  customFields: ['list', 'save', 'remove'],
  media: ['list', 'remove', 'reorder', 'open', 'pick', 'importPaths'],
  users: ['list'],
  devices: ['list', 'createPairing', 'revoke'],
  sync: ['status', 'now'],
} as const satisfies { [K in Exclude<keyof AppApi, 'platform'>]: readonly string[] };

export type IpcMethods = typeof API_METHODS;

export const API_CHANNELS: string[] = Object.entries(API_METHODS).flatMap(([ns, methods]) =>
  (methods as readonly string[]).map((m) => `api:${ns}.${m}`),
);

export type Invoke = (channel: string, ...args: unknown[]) => Promise<unknown>;

/** Construit un client AppApi à partir d'une fonction d'invocation générique. */
export function makeApiClient(platform: AppApi['platform'], invoke: Invoke): AppApi {
  const api: Record<string, unknown> = { platform };
  for (const [ns, methods] of Object.entries(API_METHODS)) {
    const group: Record<string, unknown> = {};
    for (const m of methods as readonly string[]) group[m] = (...args: unknown[]) => invoke(`api:${ns}.${m}`, ...args);
    api[ns] = group;
  }
  return api as unknown as AppApi;
}
