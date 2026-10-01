import type { Database } from 'sql.js';
import type { SqlDriver, SqlParams } from '../driver';
import { makeTransaction } from './savepoint';

/** Pilote sql.js (WebAssembly) — utilisé par la PWA mobile et les tests. */
export function sqlJsDriver(db: Database): SqlDriver & { raw: Database } {
  const bind = (params?: SqlParams) => (params ?? []) as never;
  return {
    raw: db,
    exec: (sql) => db.exec(sql),
    run(sql, params) {
      db.run(sql, bind(params));
      return { changes: db.getRowsModified() };
    },
    all<T>(sql: string, params?: SqlParams): T[] {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(bind(params));
        const out: T[] = [];
        while (stmt.step()) out.push(stmt.getAsObject() as T);
        return out;
      } finally {
        stmt.free();
      }
    },
    get<T>(sql: string, params?: SqlParams): T | undefined {
      return this.all<T>(sql, params)[0];
    },
    transaction: makeTransaction((sql) => db.exec(sql)),
  };
}
