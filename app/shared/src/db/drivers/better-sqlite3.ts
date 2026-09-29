import type { SqlDriver, SqlParams } from '../driver';
import { makeTransaction } from './savepoint';

/**
 * Sous-ensemble de l'API better-sqlite3 (et better-sqlite3-multiple-ciphers)
 * dont on a besoin — évite une dépendance de type sur le module natif.
 */
export interface BetterSqliteLike {
  exec(sql: string): unknown;
  prepare(sql: string): {
    run(...params: unknown[]): { changes: number };
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
  };
}

/** Pilote natif (SQLCipher) — utilisé par l'application de bureau. */
export function betterSqliteDriver(db: BetterSqliteLike): SqlDriver {
  const cache = new Map<string, ReturnType<BetterSqliteLike['prepare']>>();
  const stmt = (sql: string) => {
    let s = cache.get(sql);
    if (!s) {
      s = db.prepare(sql);
      if (cache.size > 500) cache.clear();
      cache.set(sql, s);
    }
    return s;
  };
  const args = (params?: SqlParams) => (params === undefined ? [] : Array.isArray(params) ? params : [params]);
  return {
    exec: (sql) => void db.exec(sql),
    run: (sql, params) => ({ changes: stmt(sql).run(...args(params)).changes }),
    all: <T>(sql: string, params?: SqlParams) => stmt(sql).all(...args(params)) as T[],
    get: <T>(sql: string, params?: SqlParams) => stmt(sql).get(...args(params)) as T | undefined,
    transaction: makeTransaction((sql) => void db.exec(sql)),
  };
}
