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
import { MediaStore } from '../electron/media-store';

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
  const media = new MediaStore(mkdtempSync(join(tmpdir(), 'alw-media-')), async (_f, mime) =>
    mime === 'image/jpeg' ? { jpeg: Buffer.from('miniature'), width: 4000, height: 3000 } : null,
  );
  hub = new Hub(newDb(), { version: 'test', lanAddresses: () => ['127.0.0.1'], lanPort: () => lan.port, media });
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

describe('médias', () => {
  it('importe des fichiers du Mac : empreinte, déduplication, miniature', async () => {
    await hub.login('admin', 'motdepasse1');
    const dir = mkdtempSync(join(tmpdir(), 'alw-src-'));
    writeFileSync(join(dir, 'façade.jpg'), 'image-bytes');
    writeFileSync(join(dir, 'copie.jpg'), 'image-bytes');
    writeFileSync(join(dir, 'titre foncier.pdf'), '%PDF-1.4');
    const villa = (await hub.listProperties({ type: 'villa' }))[0]!.id;
    const items = await hub.importMediaPaths('properties', villa, [join(dir, 'façade.jpg'), join(dir, 'copie.jpg'), join(dir, 'titre foncier.pdf')]);
    expect(items.map((m) => [m.kind, m.originalName, m.hasThumb])).toEqual([
      ['photo', 'façade.jpg', true],
      ['document', 'titre foncier.pdf', false],
    ]);
    expect(hub.media!.has(items[0]!.sha256)).toBe(true);
    expect(hub.mimeOf(items[1]!.sha256)).toBe('application/pdf');
    expect((await hub.listProperties({ type: 'villa' }))[0]!.coverSha).toBe(items[0]!.sha256);
    expect(hub.mediaFile(items[1]!.id).name).toBe('titre foncier.pdf');
  });

  it('un rôle sans droit d’écriture ne peut pas ajouter de médias', async () => {
    await hub.login('maintenance', 'motdepasse1');
    const villa = (await hub.listProperties({ type: 'villa' }))[0]!.id;
    await expect(hub.importMediaPaths('properties', villa, ['/etc/hosts'])).rejects.toThrow('Accès refusé');
    await hub.login('admin', 'motdepasse1');
  });

  it('upload depuis un téléphone puis téléchargement authentifié', async () => {
    const { body: creds } = await pair();
    const auth = { Authorization: `Bearer ${creds.deviceId}.${creds.secret}` };
    const office = (await hub.listProperties({ type: 'office' }))[0]!.id;
    const up = await fetch(`${base}/api/media?entity=properties&entityId=${office}&name=${encodeURIComponent('صورة.jpg')}`, {
      method: 'POST', headers: auth, body: Buffer.from('photo-du-telephone'),
    });
    expect(up.status).toBe(200);
    const items = (await up.json()) as { sha256: string; originalName: string; kind: string }[];
    expect(items[0]).toMatchObject({ originalName: 'صورة.jpg', kind: 'photo' });
    // La fiche est enregistrée au nom de l'utilisateur du téléphone.
    const by = hub.db.get<{ updated_by: string }>('SELECT updated_by FROM media WHERE sha256 = ?', [items[0]!.sha256])!.updated_by;
    expect(by).toBe(hub.db.get<{ id: string }>("SELECT id FROM users WHERE username = 'commercial'")!.id);

    const down = await fetch(`${base}/api/media/${items[0]!.sha256}`, { headers: auth });
    expect(down.headers.get('content-type')).toBe('image/jpeg');
    expect(await down.text()).toBe('photo-du-telephone');
    expect((await fetch(`${base}/api/media/${items[0]!.sha256}`)).status).toBe(401);
    expect((await fetch(`${base}/api/media/${'0'.repeat(64)}`, { headers: auth })).status).toBe(404);
  });

  it('upload refusé pour un rôle sans droit ou une fiche inconnue', async () => {
    const users = await hub.listUsers();
    const { body: creds } = await pair(users.find((u) => u.role === 'accountant')!.id);
    const auth = { Authorization: `Bearer ${creds.deviceId}.${creds.secret}` };
    const r1 = await fetch(`${base}/api/media?entity=properties&entityId=x&name=a.jpg`, { method: 'POST', headers: auth, body: 'x' });
    expect(r1.status).toBe(403);
    const { body: sales } = await pair();
    const auth2 = { Authorization: `Bearer ${sales.deviceId}.${sales.secret}` };
    const r2 = await fetch(`${base}/api/media?entity=properties&entityId=inexistant&name=a.jpg`, { method: 'POST', headers: auth2, body: 'x' });
    expect(r2.status).toBe(400);
    const r3 = await fetch(`${base}/api/media?entity=users&entityId=x&name=a.jpg`, { method: 'POST', headers: auth2, body: 'x' });
    expect(r3.status).toBe(400);
  });
});
