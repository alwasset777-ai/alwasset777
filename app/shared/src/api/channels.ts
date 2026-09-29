import type { AppApi } from './contract';

/**
 * Liste blanche des méthodes exposées par le processus principal. Le preload
 * n'autorise que ces canaux IPC, et l'interface construit son client à partir
 * de cette même liste.
 */
export const API_METHODS = {
  app: ['needsSetup', 'setup', 'info'],
  auth: ['current', 'login', 'logout', 'changePassword', 'setLanguage'],
  dashboard: ['kpis'],
  properties: ['list'],
  users: ['list'],
  devices: ['list', 'createPairing', 'revoke'],
  sync: ['status', 'now'],
} as const satisfies { [K in Exclude<keyof AppApi, 'platform'>]: readonly (keyof AppApi[K])[] };

export const API_CHANNELS: string[] = Object.entries(API_METHODS).flatMap(([ns, methods]) =>
  (methods as readonly string[]).map((m) => `api:${ns}.${m}`),
);

/** Construit un client AppApi à partir d'une fonction d'invocation générique. */
export function makeApiClient(platform: AppApi['platform'], invoke: (channel: string, ...args: unknown[]) => Promise<unknown>): AppApi {
  const api: Record<string, unknown> = { platform };
  for (const [ns, methods] of Object.entries(API_METHODS)) {
    const group: Record<string, unknown> = {};
    for (const m of methods as readonly string[]) group[m] = (...args: unknown[]) => invoke(`api:${ns}.${m}`, ...args);
    api[ns] = group;
  }
  return api as unknown as AppApi;
}
