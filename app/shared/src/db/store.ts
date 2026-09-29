import type { SqlDriver, SqlValue } from './driver';
import { nowIso, uuidv7 } from './ids';
import { LOCAL_ONLY_TABLES } from './migrations/index';
import type { HybridClock } from '../sync/hlc';

/**
 * Point d'entrée UNIQUE pour toute écriture sur une table synchronisée.
 *
 * Chaque champ modifié est journalisé dans `change_log` avec un horodatage
 * HLC : c'est ce journal que la synchronisation échange entre appareils.
 * Écrire directement en SQL sur une table synchronisée contournerait la
 * synchro — à proscrire.
 */
export interface StoreContext {
  db: SqlDriver;
  clock: HybridClock;
  userId?: string | null;
  companyId?: string | null;
  branchId?: string | null;
}

export type Row = Record<string, SqlValue | boolean | undefined>;

const IDENT = /^[a-z_][a-z0-9_]*$/;
const columnCache = new WeakMap<SqlDriver, Map<string, Set<string>>>();

/** Colonnes réelles d'une table (whitelist contre l'injection SQL). */
export function tableColumns(db: SqlDriver, table: string): Set<string> {
  if (!IDENT.test(table)) throw new Error(`Nom de table invalide : ${table}`);
  let perDb = columnCache.get(db);
  if (!perDb) {
    perDb = new Map();
    columnCache.set(db, perDb);
  }
  let cols = perDb.get(table);
  if (!cols) {
    cols = new Set(db.all<{ name: string }>(`PRAGMA table_info(${table})`).map((c) => c.name));
    if (cols.size === 0) throw new Error(`Table inconnue : ${table}`);
    perDb.set(table, cols);
  }
  return cols;
}

export function assertSyncedTable(db: SqlDriver, table: string): Set<string> {
  if (LOCAL_ONLY_TABLES.has(table)) throw new Error(`Table locale, non gérée par le store : ${table}`);
  const cols = tableColumns(db, table);
  if (!cols.has('id')) throw new Error(`Table sans colonne id : ${table}`);
  return cols;
}

function normalize(v: SqlValue | boolean | undefined): SqlValue {
  if (v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v;
}

function logChange(ctx: StoreContext, table: string, id: string, col: string, value: SqlValue, hlc: string) {
  ctx.db.run(
    'INSERT INTO change_log (tbl, row_id, col, value, hlc, device_id) VALUES (?, ?, ?, ?, ?, ?)',
    [table, id, col, JSON.stringify(value), hlc, ctx.clock.deviceId],
  );
  ctx.db.run(
    `INSERT INTO sync_field_clock (tbl, row_id, col, hlc) VALUES (?, ?, ?, ?)
     ON CONFLICT(tbl, row_id, col) DO UPDATE SET hlc = excluded.hlc`,
    [table, id, col, hlc],
  );
}

/** Crée une ligne et journalise tous ses champs. Retourne l'id. */
export function insert(ctx: StoreContext, table: string, data: Row): string {
  const cols = assertSyncedTable(ctx.db, table);
  const now = nowIso();
  const row: Record<string, SqlValue> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (!cols.has(k)) throw new Error(`Colonne inconnue ${table}.${k}`);
    row[k] = normalize(v);
  }
  row.id ??= uuidv7();
  if (cols.has('company_id') && row.company_id === undefined && ctx.companyId) row.company_id = ctx.companyId;
  if (cols.has('branch_id') && row.branch_id === undefined && ctx.branchId) row.branch_id = ctx.branchId;
  if (cols.has('created_at')) row.created_at ??= now;
  if (cols.has('updated_at')) row.updated_at = now;
  if (cols.has('updated_by') && ctx.userId) row.updated_by = ctx.userId;

  const keys = Object.keys(row);
  ctx.db.transaction(() => {
    ctx.db.run(
      `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
      keys.map((k) => row[k]!),
    );
    const hlc = ctx.clock.now();
    for (const k of keys) if (k !== 'id') logChange(ctx, table, row.id as string, k, row[k]!, hlc);
  });
  return row.id as string;
}

/** Met à jour uniquement les champs fournis. */
export function update(ctx: StoreContext, table: string, id: string, patch: Row): void {
  const cols = assertSyncedTable(ctx.db, table);
  const row: Record<string, SqlValue> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || k === 'id' || k === 'created_at') continue;
    if (!cols.has(k)) throw new Error(`Colonne inconnue ${table}.${k}`);
    row[k] = normalize(v);
  }
  if (cols.has('updated_at')) row.updated_at = nowIso();
  if (cols.has('updated_by') && ctx.userId) row.updated_by = ctx.userId;
  const keys = Object.keys(row);
  if (keys.length === 0) return;
  ctx.db.transaction(() => {
    const res = ctx.db.run(
      `UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
      [...keys.map((k) => row[k]!), id],
    );
    if (res.changes === 0) throw new Error(`Ligne introuvable ${table}#${id}`);
    const hlc = ctx.clock.now();
    for (const k of keys) logChange(ctx, table, id, k, row[k]!, hlc);
  });
}

/** Suppression douce : la ligne reste pour que la suppression se propage. */
export function softDelete(ctx: StoreContext, table: string, id: string): void {
  update(ctx, table, id, { deleted_at: nowIso() });
}
