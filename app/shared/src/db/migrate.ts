import type { SqlDriver } from './driver';
import { migrations as allMigrations, type Migration } from './migrations/index';

/** Applique les migrations manquantes, chacune dans sa propre transaction. */
export function migrate(db: SqlDriver, migrations: Migration[] = allMigrations): number[] {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`);
  const applied = new Set(
    db.all<{ version: number }>('SELECT version FROM schema_migrations').map((r) => r.version),
  );
  const done: number[] = [];
  for (const m of [...migrations].sort((a, b) => a.version - b.version)) {
    if (applied.has(m.version)) continue;
    db.transaction(() => {
      db.exec(m.sql);
      db.run('INSERT INTO schema_migrations (version, name) VALUES (?, ?)', [m.version, m.name]);
    });
    done.push(m.version);
  }
  return done;
}

export function getSetting(db: SqlDriver, key: string): string | undefined {
  return db.get<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [key])?.value;
}

export function setSetting(db: SqlDriver, key: string, value: string): void {
  db.run(
    'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}
