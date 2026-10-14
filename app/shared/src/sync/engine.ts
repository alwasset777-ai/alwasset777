import type { SqlDriver, SqlValue } from '../db/driver';
import { LOCAL_ONLY_TABLES, NEVER_SYNC_COLUMNS } from '../db/migrations/index';
import { tableColumns } from '../db/store';
import type { HybridClock } from './hlc';
import type { Change, PullResponse } from './protocol';

/**
 * Moteur de synchronisation « dernier écrivain gagne, champ par champ ».
 *
 * - Chaque appareil journalise ses écritures dans `change_log` (voir store.ts).
 * - Le poste principal (hub) agrège tous les journaux ; les autres appareils
 *   lui envoient leurs changements (push) et récupèrent ceux des autres (pull).
 * - Pour chaque champ, l'horodatage HLC le plus grand l'emporte : l'ordre
 *   d'arrivée n'a pas d'importance et l'application est idempotente.
 */

const neverSync = (tbl: string, col: string) => NEVER_SYNC_COLUMNS[tbl]?.includes(col) ?? false;

/** Changements à envoyer à un pair, à partir du curseur `after` (côté hub). */
export function pullChanges(db: SqlDriver, after: number, limit = 2000): PullResponse {
  const rows = db.all<Change & { seq: number }>(
    'SELECT seq, tbl, row_id, col, value, hlc, device_id FROM change_log WHERE seq > ? ORDER BY seq LIMIT ?',
    [after, limit + 1],
  );
  let hasMore = rows.length > limit;
  let page = rows.slice(0, limit);
  // Ne jamais couper la création d'une ligne en deux pages : ses champs
  // sont contigus dans le journal, on complète donc la dernière ligne.
  if (hasMore && page.length > 0) {
    const last = page[page.length - 1]!;
    const rest = db.all<Change & { seq: number }>(
      'SELECT seq, tbl, row_id, col, value, hlc, device_id FROM change_log WHERE seq > ? ORDER BY seq LIMIT 500',
      [last.seq],
    );
    for (const r of rest) {
      if (r.tbl !== last.tbl || r.row_id !== last.row_id) break;
      page.push(r);
    }
    hasMore = db.get('SELECT 1 FROM change_log WHERE seq > ? LIMIT 1', [page[page.length - 1]!.seq]) !== undefined;
  }
  const cursor = page.length ? page[page.length - 1]!.seq : after;
  page = page.filter((c) => !neverSync(c.tbl, c.col));
  return { changes: page, cursor, hasMore };
}

/** Changements créés localement par `deviceId` après `afterSeq` (côté client). */
export function localChanges(db: SqlDriver, deviceId: string, afterSeq: number, limit = 2000): Change[] {
  return db.all<Change>(
    'SELECT seq, tbl, row_id, col, value, hlc, device_id FROM change_log WHERE device_id = ? AND seq > ? ORDER BY seq LIMIT ?',
    [deviceId, afterSeq, limit],
  );
}

export interface ApplyOptions {
  /** Refuse un changement (ex. droits insuffisants). */
  accept?: (c: Change) => boolean;
}

export interface ApplyResult {
  applied: number;
  skipped: number;
  rejected: number;
}

/** Applique des changements distants de façon idempotente. */
export function applyChanges(db: SqlDriver, clock: HybridClock, changes: Change[], opts: ApplyOptions = {}): ApplyResult {
  const result: ApplyResult = { applied: 0, skipped: 0, rejected: 0 };

  // Regroupe par ligne en conservant l'ordre d'arrivée.
  const groups = new Map<string, Change[]>();
  for (const c of changes) {
    const valid =
      typeof c.tbl === 'string' &&
      typeof c.col === 'string' &&
      typeof c.row_id === 'string' &&
      !LOCAL_ONLY_TABLES.has(c.tbl) &&
      !neverSync(c.tbl, c.col) &&
      c.col !== 'id' &&
      isKnownColumn(db, c.tbl, c.col) &&
      (opts.accept?.(c) ?? true);
    if (!valid) {
      result.rejected++;
      continue;
    }
    const key = `${c.tbl}\u0000${c.row_id}`;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = []));
    g.push(c);
  }

  db.transaction(() => {
    db.exec('PRAGMA defer_foreign_keys = ON');
    for (const group of groups.values()) {
      const { tbl, row_id } = group[0]!;
      // Pour chaque champ, garder le changement au HLC le plus grand.
      const winners = new Map<string, Change>();
      for (const c of group) {
        clock.receive(c.hlc);
        const current = winners.get(c.col);
        if (!current || c.hlc > current.hlc) winners.set(c.col, c);
      }
      for (const [col, c] of [...winners]) {
        const local = db.get<{ hlc: string }>(
          'SELECT hlc FROM sync_field_clock WHERE tbl = ? AND row_id = ? AND col = ?',
          [tbl, row_id, col],
        );
        if (local && local.hlc >= c.hlc) winners.delete(col);
      }
      result.skipped += group.length - winners.size;
      if (winners.size === 0) continue;

      const cols = [...winners.keys()];
      const values = cols.map((col) => decodeValue(winners.get(col)!.value));
      try {
        db.transaction(() => {
          const exists = db.get(`SELECT 1 FROM ${tbl} WHERE id = ?`, [row_id]) !== undefined;
          if (exists) {
            db.run(`UPDATE ${tbl} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [...values, row_id]);
          } else {
            db.run(
              `INSERT INTO ${tbl} (id, ${cols.join(', ')}) VALUES (?, ${cols.map(() => '?').join(', ')})`,
              [row_id, ...values],
            );
          }
          for (const c of winners.values()) {
            db.run(
              'INSERT INTO change_log (tbl, row_id, col, value, hlc, device_id) VALUES (?, ?, ?, ?, ?, ?)',
              [c.tbl, c.row_id, c.col, c.value, c.hlc, c.device_id],
            );
            db.run(
              `INSERT INTO sync_field_clock (tbl, row_id, col, hlc) VALUES (?, ?, ?, ?)
               ON CONFLICT(tbl, row_id, col) DO UPDATE SET hlc = excluded.hlc`,
              [c.tbl, c.row_id, c.col, c.hlc],
            );
          }
        });
        result.applied += winners.size;
      } catch (err) {
        // Ex. mise à jour partielle d'une ligne pas encore reçue : on la
        // garde de côté et on réessaiera après les prochains lots.
        db.run('INSERT INTO sync_inbox (payload, error) VALUES (?, ?)', [
          JSON.stringify([...winners.values()]),
          String(err instanceof Error ? err.message : err),
        ]);
      }
    }
  });
  return result;
}

/** Réessaie les changements mis de côté (à appeler après chaque pull). */
export function retryInbox(db: SqlDriver, clock: HybridClock): number {
  const pending = db.all<{ id: number; payload: string }>('SELECT id, payload FROM sync_inbox ORDER BY id');
  if (pending.length === 0) return 0;
  db.run('DELETE FROM sync_inbox WHERE id <= ?', [pending[pending.length - 1]!.id]);
  let applied = 0;
  for (const p of pending) applied += applyChanges(db, clock, JSON.parse(p.payload) as Change[]).applied;
  return applied;
}

function isKnownColumn(db: SqlDriver, tbl: string, col: string): boolean {
  try {
    return tableColumns(db, tbl).has(col);
  } catch {
    return false;
  }
}

function decodeValue(v: string | null): SqlValue {
  if (v === null) return null;
  const parsed: unknown = JSON.parse(v);
  if (parsed === null || typeof parsed === 'string' || typeof parsed === 'number') return parsed;
  if (typeof parsed === 'boolean') return parsed ? 1 : 0;
  return JSON.stringify(parsed);
}
