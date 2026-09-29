import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AppApi } from '../api/contract';

const Ctx = createContext<AppApi | null>(null);
/** Incrémenté quand des données arrivent par synchro : les écrans se rechargent. */
const DataVersion = createContext(0);

export function ApiProvider({ api, dataVersion = 0, children }: { api: AppApi; dataVersion?: number; children: ReactNode }) {
  return (
    <Ctx.Provider value={api}>
      <DataVersion.Provider value={dataVersion}>{children}</DataVersion.Provider>
    </Ctx.Provider>
  );
}

export function useApi(): AppApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('ApiProvider manquant');
  return v;
}

/** Charge une donnée asynchrone ; `reload()` relance la requête. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  const [tick, setTick] = useState(0);
  const version = useContext(DataVersion);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    fn().then(
      (data) => alive && setState({ data, loading: false }),
      (e: unknown) => alive && setState({ error: errorMessage(e), loading: false }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, version]);
  return { ...state, reload: () => setTick((n) => n + 1) };
}

export function errorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  // Electron préfixe les erreurs IPC : « Error invoking remote method 'x': Error: … »
  return msg.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}

/**
 * Champs fautifs d'une ValidationError. Le message survit au passage IPC
 * (« Validation : title=required, price=invalid »), on le relit donc ici.
 */
export function validationFields(e: unknown): Record<string, string> | null {
  const m = /Validation : (.*)$/.exec(errorMessage(e));
  if (!m) return null;
  return Object.fromEntries(m[1]!.split(', ').map((pair) => pair.split('=') as [string, string]));
}
