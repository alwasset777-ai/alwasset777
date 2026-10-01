import { describe, expect, it } from 'vitest';
import { insert, softDelete, update } from '../src/db/store';
import { applyChanges, localChanges, pullChanges, retryInbox } from '../src/sync/engine';
import { HybridClock, parseHlc } from '../src/sync/hlc';
import type { Change } from '../src/sync/protocol';
import { context } from './helpers';

describe('HybridClock', () => {
  it('est monotone même si l’horloge murale recule', () => {
    let t = 1000;
    const c = new HybridClock('dev1', () => t);
    const a = c.now();
    t = 500;
    const b = c.now();
    expect(b > a).toBe(true);
    expect(parseHlc(b)).toMatchObject({ ms: 1000, counter: 1, deviceId: 'dev1' });
  });
  it('receive dépasse un horodatage distant', () => {
    const c = new HybridClock('dev1', () => 1000);
    c.receive(new HybridClock('dev2', () => 5000).now());
    expect(parseHlc(c.now()).ms).toBe(5000);
  });
});

/** Simule un cycle push + pull complet entre un client et le hub. */
function syncOnce(hub: ReturnType<typeof context>, client: ReturnType<typeof context>, state: { pushed: number; pulled: number }) {
  const out = localChanges(client.db, client.clock.deviceId, state.pushed);
  if (out.length) {
    applyChanges(hub.db, hub.clock, out);
    state.pushed = out[out.length - 1]!.seq!;
  }
  for (;;) {
    const page = pullChanges(hub.db, state.pulled, 7);
    applyChanges(client.db, client.clock, page.changes);
    retryInbox(client.db, client.clock);
    state.pulled = page.cursor;
    if (!page.hasMore) break;
  }
}

describe('synchronisation', () => {
  it('réplique les créations du hub vers un client (pages sans couper une ligne)', () => {
    const hub = context('hub');
    const client = context('phone');
    for (let i = 0; i < 5; i++) insert(hub, 'properties', { reference: `P${i}`, title: `Bien ${i}`, city: 'Rabat', status: 'available' });
    syncOnce(hub, client, { pushed: 0, pulled: 0 });
    const rows = client.db.all<{ reference: string }>('SELECT reference FROM properties ORDER BY reference');
    expect(rows.map((r) => r.reference)).toEqual(['P0', 'P1', 'P2', 'P3', 'P4']);
    expect(client.db.get<{ n: number }>('SELECT COUNT(*) AS n FROM sync_inbox')!.n).toBe(0);
  });

  it('fusionne champ par champ : deux modifications concurrentes de champs différents sont conservées', () => {
    let t = 1_000;
    const hub = context('hub', () => t);
    const phone = context('phone', () => t);
    const s = { pushed: 0, pulled: 0 };
    const id = insert(hub, 'properties', { title: 'Villa', price_sale_cents: 100, status: 'available' });
    syncOnce(hub, phone, s);

    t = 2_000;
    update(hub, 'properties', id, { price_sale_cents: 200 });
    t = 3_000;
    update(phone, 'properties', id, { status: 'reserved' });
    syncOnce(hub, phone, s);

    for (const db of [hub.db, phone.db]) {
      expect(db.get('SELECT price_sale_cents, status FROM properties WHERE id = ?', [id])).toEqual({
        price_sale_cents: 200,
        status: 'reserved',
      });
    }
  });

  it('même champ modifié des deux côtés : le plus récent (HLC) gagne partout', () => {
    let t = 1_000;
    const hub = context('hub', () => t);
    const phone = context('phone', () => t);
    const s = { pushed: 0, pulled: 0 };
    const id = insert(hub, 'properties', { title: 'A' });
    syncOnce(hub, phone, s);
    t = 5_000;
    update(phone, 'properties', id, { title: 'Téléphone (plus récent)' });
    t = 4_000;
    update(hub, 'properties', id, { title: 'Hub (plus ancien)' });
    syncOnce(hub, phone, s);
    expect(hub.db.get<{ title: string }>('SELECT title FROM properties WHERE id = ?', [id])!.title).toBe('Téléphone (plus récent)');
    expect(phone.db.get<{ title: string }>('SELECT title FROM properties WHERE id = ?', [id])!.title).toBe('Téléphone (plus récent)');
  });

  it('est idempotent et propage les suppressions douces', () => {
    const hub = context('hub');
    const phone = context('phone');
    const id = insert(hub, 'persons', { full_name: 'Test' });
    softDelete(hub, 'persons', id);
    const all = pullChanges(hub.db, 0).changes;
    applyChanges(phone.db, phone.clock, all);
    const again = applyChanges(phone.db, phone.clock, all);
    expect(again.applied).toBe(0);
    expect(phone.db.get<{ deleted_at: string | null }>('SELECT deleted_at FROM persons WHERE id = ?', [id])!.deleted_at).not.toBeNull();
  });

  it('ne diffuse jamais les mots de passe et rejette les tables/colonnes inconnues', () => {
    const hub = context('hub');
    insert(hub, 'users', { username: 'admin', full_name: 'Admin', password_hash: 'secret-hash' });
    const changes = pullChanges(hub.db, 0).changes;
    expect(changes.some((c) => c.col === 'password_hash')).toBe(false);

    const evil: Change[] = [
      { tbl: 'users', row_id: 'x', col: 'password_hash', value: '"pwned"', hlc: new HybridClock('evil').now(), device_id: 'evil' },
      { tbl: 'devices', row_id: 'x', col: 'name', value: '"x"', hlc: new HybridClock('evil').now(), device_id: 'evil' },
      { tbl: 'properties; DROP TABLE users', row_id: 'x', col: 'title', value: '"x"', hlc: new HybridClock('evil').now(), device_id: 'evil' },
      { tbl: 'properties', row_id: 'x', col: 'title = 1; --', value: '"x"', hlc: new HybridClock('evil').now(), device_id: 'evil' },
    ];
    const r = applyChanges(hub.db, hub.clock, evil);
    expect(r).toMatchObject({ applied: 0, rejected: 4 });
  });

  it('applique le filtre de droits fourni par le hub', () => {
    const hub = context('hub');
    const c: Change = { tbl: 'users', row_id: 'u1', col: 'role', value: '"admin"', hlc: new HybridClock('phone').now(), device_id: 'phone' };
    const r = applyChanges(hub.db, hub.clock, [c], { accept: (x) => x.tbl !== 'users' });
    expect(r.rejected).toBe(1);
  });
});
