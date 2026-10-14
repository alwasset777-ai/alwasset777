/**
 * Abstraction minimale au-dessus de SQLite.
 *
 * Deux implémentations partagent exactement le même schéma et les mêmes
 * services :
 *  - desktop : better-sqlite3-multiple-ciphers (SQLCipher, synchrone, natif)
 *  - mobile  : sql.js (SQLite compilé en WebAssembly, persisté dans IndexedDB)
 *
 * L'API est volontairement synchrone : les deux moteurs le sont, ce qui rend
 * les transactions simples et sûres.
 */
export type SqlValue = string | number | bigint | null | Uint8Array;
export type SqlParams = readonly SqlValue[] | Record<string, SqlValue>;

export interface SqlDriver {
  exec(sql: string): void;
  run(sql: string, params?: SqlParams): { changes: number };
  all<T = Record<string, unknown>>(sql: string, params?: SqlParams): T[];
  get<T = Record<string, unknown>>(sql: string, params?: SqlParams): T | undefined;
  /** Exécute `fn` dans une transaction ; annule tout en cas d'exception. */
  transaction<T>(fn: () => T): T;
}
