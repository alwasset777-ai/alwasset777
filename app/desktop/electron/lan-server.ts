import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { canWriteTable } from '@alwasset/shared/auth/permissions';
import { applyChanges, pullChanges } from '@alwasset/shared/sync/engine';
import type { Change, PairRequest, PushRequest } from '@alwasset/shared/sync/protocol';
import { sha256, type Hub } from './hub';

/**
 * Serveur HTTP du réseau local de l'agence :
 *  - /m/…            application mobile (PWA) servie depuis le Mac ;
 *  - /api/pair       appairage avec le jeton du QR code ;
 *  - /api/sync/pull  changements du hub vers l'appareil ;
 *  - /api/sync/push  changements de l'appareil vers le hub.
 * Chaque appareil s'authentifie avec « Bearer <deviceId>.<secret> ».
 */
export const DEFAULT_LAN_PORT = 47777;
const MAX_BODY = 20 * 1024 * 1024;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export interface LanServer {
  server: Server;
  port: number;
  close(): Promise<void>;
}

export function startLanServer(hub: Hub, opts: { port?: number; host?: string; mobileDir?: string | null } = {}): Promise<LanServer> {
  const server = createServer((req, res) => {
    handle(hub, opts.mobileDir ?? null, req, res).catch((err: unknown) => {
      const status = err instanceof HttpError ? err.status : 500;
      if (status === 500) console.error('[lan]', err);
      sendJson(res, status, { error: err instanceof Error && status !== 500 ? err.message : 'Erreur interne' });
    });
  });
  server.requestTimeout = 60_000;
  return new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(opts.port ?? DEFAULT_LAN_PORT, opts.host ?? '0.0.0.0', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolvePromise({ server, port, close: () => new Promise((r) => server.close(() => r())) });
    });
  });
}

async function handle(hub: Hub, mobileDir: string | null, req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');

  if (url.pathname === '/') {
    res.writeHead(302, { Location: '/m/' }).end();
    return;
  }
  if (url.pathname === '/api/ping' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, hubId: hub.deviceId });
  }
  if (url.pathname === '/api/pair' && req.method === 'POST') {
    const body = (await readJson(req)) as Partial<PairRequest>;
    if (typeof body.token !== 'string') throw new HttpError(400, 'Jeton manquant');
    const paired = hub.pairDevice(body.token, String(body.deviceName ?? ''), String(body.platform ?? ''), clientIp(req));
    if (!paired) throw new HttpError(401, 'QR code expiré ou déjà utilisé');
    return sendJson(res, 200, paired);
  }
  if (url.pathname === '/api/sync/pull' && req.method === 'GET') {
    authenticate(hub, req);
    const after = Math.max(0, Number(url.searchParams.get('after') ?? 0) || 0);
    return sendJson(res, 200, pullChanges(hub.db, after));
  }
  if (url.pathname === '/api/sync/push' && req.method === 'POST') {
    const device = authenticate(hub, req);
    const body = (await readJson(req)) as Partial<PushRequest>;
    if (!Array.isArray(body.changes)) throw new HttpError(400, 'Format invalide');
    const changes = body.changes as Change[];
    const result = applyChanges(hub.db, hub.clock, changes, {
      // Un appareil ne peut écrire que ses propres changements, dans les tables autorisées pour son rôle.
      accept: (c) => c.device_id === device.id && canWriteTable(device.role, c.tbl),
    });
    return sendJson(res, 200, result);
  }
  if (url.pathname.startsWith('/m/') || url.pathname === '/m') {
    if (!mobileDir) throw new HttpError(404, 'Application mobile non incluse dans cette version');
    return serveStatic(mobileDir, url.pathname.replace(/^\/m\/?/, ''), res);
  }
  throw new HttpError(404, 'Introuvable');
}

function authenticate(hub: Hub, req: IncomingMessage): { id: string; role: string | null } {
  const m = /^Bearer (dev_[a-f0-9]+)\.([A-Za-z0-9_-]+)$/.exec(req.headers.authorization ?? '');
  if (!m) throw new HttpError(401, 'Appareil non authentifié');
  const row = hub.db.get<{ id: string; secret_hash: string; revoked_at: string | null; role: string | null; active: number | null }>(
    `SELECT d.id, d.secret_hash, d.revoked_at, u.role, u.active FROM devices d LEFT JOIN users u ON u.id = d.user_id WHERE d.id = ?`,
    [m[1]!],
  );
  const given = Buffer.from(sha256(m[2]!), 'hex');
  const ok = row && timingSafeEqual(given, Buffer.from(row.secret_hash, 'hex'));
  if (!row || !ok || row.revoked_at || row.active !== 1) throw new HttpError(401, 'Appareil révoqué ou inconnu');
  hub.db.run('UPDATE devices SET last_seen_at = ?, last_ip = ? WHERE id = ?', [new Date().toISOString(), clientIp(req), row.id]);
  return { id: row.id, role: row.role };
}

function clientIp(req: IncomingMessage): string | null {
  return req.socket.remoteAddress?.replace(/^::ffff:/, '') ?? null;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) throw new HttpError(413, 'Requête trop volumineuse');
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'JSON invalide');
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  if (res.headersSent) return;
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function serveStatic(root: string, rel: string, res: ServerResponse) {
  const base = resolve(root);
  let decoded: string;
  try {
    decoded = decodeURIComponent(rel || 'index.html');
  } catch {
    throw new HttpError(400, 'Chemin invalide');
  }
  let file = resolve(base, normalize(decoded));
  if (file !== base && !file.startsWith(base + sep)) throw new HttpError(403, 'Interdit');
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(base, 'index.html'); // application monopage
  const type = MIME[extname(file)] ?? 'application/octet-stream';
  const immutable = file.includes(`${sep}assets${sep}`);
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache' });
  createReadStream(file).pipe(res);
}
