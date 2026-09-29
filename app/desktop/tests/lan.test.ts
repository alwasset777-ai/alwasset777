import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import initSqlJs from 'sql.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sqlJsDriver } from '@alwasset/shared/db/drivers/sqljs';
import { migrate } from '@alwasset/shared/db/migrate';
import { insert, update } from '@alwasset/shared/db/store';
import { applyChanges, localChanges } from '@alwasset/shared/sync/engine';
import { HybridClock } from '@alwasset/shared/sync/hlc';
import { decodePairingPayload, type PairResponse, type PullResponse } from '@alwasset/shared/sync/protocol';
import { Hub } from '../electron/hub';
import { startLanServer, type LanServer } from '../electron/lan-server';
import { hashPassword, verifyPassword } from '../electron/passwords';

const SQL = await initSqlJs();
const newDb = () => {
  const d = sqlJsDriver(new SQL.Database());
  migrate(d);
  return d;
};

let hub: Hub;
let lan: LanServer;
let base: string;

beforeAll(async () => {
  hub = new Hub(newDb(), { version: 'test', lanAddresses: () => ['127.0.0.1'], lanPort: () => lan.port });
  await hub.setup({
    agencyName: 'الوسيط 777', city: 'الدار البيضاء', adminFullName: 'منير', adminUsername: 'admin',
    adminPassword: 'motdepasse1', language: 'ar', withDemoData: true,
  });
  const mobileDir = mkdtempSync(join(tmpdir(), 'alw-m-'));
  writeFileSync(join(mobileDir, 'index.html'), '<html>pwa</html>');
  lan = await startLanServer(hub, { port: 0, host: '127.0.0.1', mobileDir });
  base = `http://127.0.0.1:${lan.port}`;
});

afterAll(() => lan.close());

async function pair(userId?: string) {
  const users = await hub.listUsers();
  const uid = userId ?? users.find((u) => u.role === 'sales')!.id;
  const offer = await hub.createPairing(uid);
  const payload = decodePairingPayload(offer.url.split('#pair=')[1]!);
  const res = await fetch(`${payload.hub}/api/pair`, {
    method: 'POST',
    body: JSON.stringify({ token: payload.token, deviceName: 'iPhone', platform: 'iPhone' }),
  });
  return { res, payload, offer, body: (await res.json()) as PairResponse & { error?: string } };
}

describe('mots de passe', () => {
  it('scrypt : vérifie le bon mot de passe et rejette le mauvais', async () => {
    const h = hashPassword('motdepasse1');
    expect(h.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('motdepasse1', h)).toBe(true);
    expect(await verifyPassword('mauvais', h)).toBe(false);
    expect(await verifyPassword('x', null)).toBe(false);
  });
  it('login / refus', async () => {
    await expect(hub.login('admin', 'mauvais')).rejects.toThrow();
    const u = await hub.login('admin', 'motdepasse1');
    expect(u.role).toBe('admin');
    const demo = await hub.login('commercial', 'motdepasse1');
    expect(demo.mustChangePassword).toBe(true);
    await hub.login('admin', 'motdepasse1');
  });
});

describe('appairage par QR code', () => {
  it('le QR code contient une URL /m/ du Mac et une image', async () => {
    const offer = await hub.createPairing((await hub.listUsers())[0]!.id);
    expect(offer.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/m\/#pair=/);
    expect(offer.qrDataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('jeton à usage unique', async () => {
    const first = await pair();
    expect(first.res.status).toBe(200);
    expect(first.body.deviceId).toMatch(/^dev_/);
    const again = await fetch(`${base}/api/pair`, { method: 'POST', body: JSON.stringify({ token: first.payload.token }) });
    expect(again.status).toBe(401);
  });

  it('refuse un appairage sans session admin', async () => {
    await hub.logout();
    await expect(hub.createPairing('x')).rejects.toThrow();
    await hub.login('admin', 'motdepasse1');
  });
});

describe('synchronisation via le réseau local', () => {
  it('pull complet, push autorisé, push interdit filtré, révocation', async () => {
    const { body: creds } = await pair();
    const auth = { Authorization: `Bearer ${creds.deviceId}.${creds.secret}` };

    // Pull complet vers une base mobile vierge
    const phone = { db: newDb(), clock: new HybridClock(creds.deviceId) };
    let after = 0;
    for (;;) {
      const page = (await (await fetch(`${base}/api/sync/pull?after=${after}`, { headers: auth })).json()) as PullResponse;
      applyChanges(phone.db, phone.clock, page.changes);
      after = page.cursor;
      if (!page.hasMore) break;
    }
    expect(phone.db.get<{ n: number }>('SELECT COUNT(*) AS n FROM properties')!.n).toBe(10);
    expect(phone.db.get<{ n: number }>('SELECT COUNT(*) AS n FROM users WHERE password_hash IS NOT NULL')!.n).toBe(0);

    // Le commercial crée un prospect et tente de se promouvoir admin
    const person = insert(phone, 'persons', { full_name: 'Nouveau client', phone: '+212600000000' });
    const me = phone.db.get<{ id: string }>("SELECT id FROM users WHERE username = 'commercial'")!.id;
    update(phone, 'users', me, { role: 'admin' });
    const push = await fetch(`${base}/api/sync/push`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ changes: localChanges(phone.db, creds.deviceId, 0) }),
    });
    const result = (await push.json()) as { applied: number; rejected: number };
    expect(result.applied).toBeGreaterThan(0);
    expect(result.rejected).toBeGreaterThan(0);
    expect(hub.db.get<{ full_name: string }>('SELECT full_name FROM persons WHERE id = ?', [person])!.full_name).toBe('Nouveau client');
    expect(hub.db.get<{ role: string }>('SELECT role FROM users WHERE id = ?', [me])!.role).toBe('sales');

    // Révocation → 401
    await hub.revokeDevice(creds.deviceId);
    const denied = await fetch(`${base}/api/sync/pull?after=0`, { headers: auth });
    expect(denied.status).toBe(401);
  });

  it('refuse les requêtes sans identifiants ou avec un faux secret', async () => {
    expect((await fetch(`${base}/api/sync/pull`)).status).toBe(401);
    const { body } = await pair();
    const bad = await fetch(`${base}/api/sync/pull`, { headers: { Authorization: `Bearer ${body.deviceId}.faux` } });
    expect(bad.status).toBe(401);
  });

  it('sert la PWA et bloque la traversée de répertoires', async () => {
    const page = await fetch(`${base}/m/`);
    expect(await page.text()).toContain('pwa');
    const trav = await fetch(`${base}/m/..%2f..%2fetc%2fpasswd`);
    expect(trav.status).toBe(403);
  });
});
