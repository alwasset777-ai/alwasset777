import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { sqlJsDriver } from '@alwasset/shared/db/drivers/sqljs';
import { migrate } from '@alwasset/shared/db/migrate';
import { loadBytes, saveBytes } from './storage';

const KEY = 'main.sqlite';

/**
 * Base locale du mobile : SQLite (WebAssembly) avec EXACTEMENT le même schéma
 * et les mêmes migrations que le Mac, sauvegardée dans IndexedDB.
 */
export async function openLocalDb() {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const bytes = await loadBytes(KEY);
  const raw = new SQL.Database(bytes ?? undefined);
  const driver = sqlJsDriver(raw);
  driver.exec('PRAGMA foreign_keys = ON');
  migrate(driver);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const persist = async () => {
    clearTimeout(timer);
    await saveBytes(KEY, raw.export());
  };
  const schedulePersist = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void persist(), 500);
  };
  window.addEventListener('pagehide', () => void persist());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void persist();
  });
  return { driver, persist, schedulePersist };
}
