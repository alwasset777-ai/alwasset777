import { createHash } from 'node:crypto';
import initSqlJs from 'sql.js';
import { sqlJsDriver } from '../src/db/drivers/sqljs';
import { migrate } from '../src/db/migrate';
import type { StoreContext } from '../src/db/store';
import { HybridClock } from '../src/sync/hlc';

const SQL = await initSqlJs();

export function memoryDb() {
  const db = sqlJsDriver(new SQL.Database());
  db.exec('PRAGMA foreign_keys = ON');
  migrate(db);
  return db;
}

export function context(deviceId: string, wallClock?: () => number): StoreContext {
  return { db: memoryDb(), clock: new HybridClock(deviceId, wallClock) };
}

/** Hachage factice pour les tests (le vrai utilise scrypt côté desktop). */
export const fakeHash = (p: string) => createHash('sha256').update(p).digest('hex');
