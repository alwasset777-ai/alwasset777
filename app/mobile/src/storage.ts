/** Persistance de la base SQLite (octets) dans IndexedDB. */
const DB_NAME = 'alwasset';
const STORE = 'files';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export const loadBytes = (key: string) => tx<Uint8Array | undefined>('readonly', (s) => s.get(key));
export const saveBytes = (key: string, bytes: Uint8Array) => tx('readwrite', (s) => s.put(bytes, key));
export const deleteAll = () => tx('readwrite', (s) => s.clear());

export interface Credentials {
  hub: string;
  deviceId: string;
  secret: string;
  hubId: string;
  user: { id: string; fullName: string; role: string; language: string };
}

const CRED_KEY = 'alwasset.device';

export function loadCredentials(): Credentials | null {
  try {
    const raw = localStorage.getItem(CRED_KEY);
    return raw ? (JSON.parse(raw) as Credentials) : null;
  } catch {
    return null;
  }
}

export function saveCredentials(c: Credentials | null): void {
  if (c) localStorage.setItem(CRED_KEY, JSON.stringify(c));
  else localStorage.removeItem(CRED_KEY);
}
