import { createHash, randomBytes } from 'node:crypto';
import QRCode from 'qrcode';
import type { AppApi, DeviceInfo, PairingOffer, SessionUser, SetupInput, SyncStatus } from '@alwasset/shared/api/contract';
import { can, isRole, type Permission } from '@alwasset/shared/auth/permissions';
import type { SqlDriver } from '@alwasset/shared/db/driver';
import { getSetting, setSetting } from '@alwasset/shared/db/migrate';
import { update, type StoreContext } from '@alwasset/shared/db/store';
import { todayIso } from '@alwasset/shared/finance/dates';
import { isLang, type Lang } from '@alwasset/shared/i18n/index';
import { computeKpis } from '@alwasset/shared/services/dashboard';
import { listProperties } from '@alwasset/shared/services/properties';
import { needsSetup, setupAgency } from '@alwasset/shared/services/setup';
import { listUsers } from '@alwasset/shared/services/users';
import { HybridClock } from '@alwasset/shared/sync/hlc';
import { encodePairingPayload } from '@alwasset/shared/sync/protocol';
import { hashPassword, verifyPassword } from './passwords';

export const PAIRING_TTL_MS = 10 * 60 * 1000;

/** Identifiant stable du poste principal, créé au premier lancement. */
export function hubDeviceId(db: SqlDriver): string {
  let id = getSetting(db, 'device_id');
  if (!id) {
    id = `hub_${randomBytes(6).toString('hex')}`;
    setSetting(db, 'device_id', id);
  }
  return id;
}

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

interface UserRow {
  id: string;
  username: string;
  full_name: string;
  role: string;
  language: string;
  password_hash: string | null;
  must_change_password: number;
  active: number;
}

/**
 * Logique métier du poste principal, indépendante d'Electron (testable en
 * Node). Chaque méthode publique vérifie la session et les permissions.
 */
export class Hub {
  readonly clock: HybridClock;
  readonly deviceId: string;
  private session: SessionUser | null = null;
  private readonly pairingTokens = new Map<string, { userId: string; expiresAt: number }>();

  constructor(
    readonly db: SqlDriver,
    private readonly opts: { version: string; lanAddresses: () => string[]; lanPort: () => number | null },
  ) {
    this.deviceId = hubDeviceId(db);
    this.clock = new HybridClock(this.deviceId);
  }

  ctx(): StoreContext {
    return {
      db: this.db,
      clock: this.clock,
      userId: this.session?.id ?? null,
      companyId: getSetting(this.db, 'company_id') ?? null,
      branchId: getSetting(this.db, 'branch_id') ?? null,
    };
  }

  private require(p: Permission): SessionUser {
    if (!this.session) throw new Error('Session expirée, veuillez vous reconnecter');
    if (!can(this.session.role, p)) throw new Error('Accès refusé');
    return this.session;
  }

  private toSession(u: UserRow): SessionUser {
    return {
      id: u.id,
      username: u.username,
      fullName: u.full_name,
      role: isRole(u.role) ? u.role : 'sales',
      language: isLang(u.language) ? u.language : 'ar',
      mustChangePassword: u.must_change_password === 1,
    };
  }

  // ── app
  async needsSetup() {
    return needsSetup(this.ctx());
  }

  async setup(input: SetupInput) {
    const res = setupAgency(this.ctx(), input, hashPassword, todayIso());
    const admin = this.db.get<UserRow>('SELECT * FROM users WHERE id = ?', [res.adminId])!;
    this.session = this.toSession(admin);
  }

  async info() {
    const name = this.db.get<{ name: string }>('SELECT name FROM companies WHERE deleted_at IS NULL LIMIT 1');
    return { version: this.opts.version, agencyName: name?.name ?? '', hubId: this.deviceId };
  }

  // ── auth
  async current() {
    return this.session;
  }

  async login(username: string, password: string) {
    const u = this.db.get<UserRow>('SELECT * FROM users WHERE username = ? AND deleted_at IS NULL', [String(username).trim()]);
    const ok = await verifyPassword(String(password), u?.password_hash);
    if (!u || !ok || u.active !== 1) {
      await new Promise((r) => setTimeout(r, 400));
      throw new Error('Identifiants invalides');
    }
    this.session = this.toSession(u);
    return this.session;
  }

  async logout() {
    this.session = null;
  }

  async changePassword(oldPassword: string, newPassword: string) {
    const s = this.require('dashboard.read');
    if (String(newPassword).length < 8) throw new Error('Mot de passe trop court (8 caractères minimum)');
    const u = this.db.get<UserRow>('SELECT * FROM users WHERE id = ?', [s.id]);
    if (!u || !(await verifyPassword(String(oldPassword), u.password_hash))) throw new Error('Mot de passe actuel incorrect');
    update(this.ctx(), 'users', s.id, { password_hash: hashPassword(String(newPassword)), must_change_password: 0 });
    this.session = { ...s, mustChangePassword: false };
  }

  async setLanguage(lang: Lang) {
    const s = this.require('dashboard.read');
    if (!isLang(lang)) throw new Error('Langue inconnue');
    update(this.ctx(), 'users', s.id, { language: lang });
    this.session = { ...s, language: lang };
  }

  // ── données
  async kpis() {
    this.require('dashboard.read');
    return computeKpis(this.db, todayIso());
  }

  async listProperties(filters: Parameters<AppApi['properties']['list']>[0]) {
    this.require('properties.read');
    return listProperties(this.db, filters ?? {});
  }

  async listUsers() {
    this.require('dashboard.read');
    return listUsers(this.db);
  }

  // ── appareils
  async listDevices(): Promise<DeviceInfo[]> {
    this.require('devices.manage');
    return this.db
      .all<{ id: string; name: string; platform: string | null; userName: string | null; paired_at: string; last_seen_at: string | null; last_ip: string | null; revoked_at: string | null }>(
        `SELECT d.id, d.name, d.platform, u.full_name AS userName, d.paired_at, d.last_seen_at, d.last_ip, d.revoked_at
         FROM devices d LEFT JOIN users u ON u.id = d.user_id ORDER BY d.paired_at DESC`,
      )
      .map((d) => ({
        id: d.id, name: d.name, platform: d.platform, userName: d.userName, pairedAt: d.paired_at,
        lastSeenAt: d.last_seen_at, lastIp: d.last_ip, revoked: d.revoked_at !== null,
      }));
  }

  async createPairing(userId: string, address?: string): Promise<PairingOffer> {
    this.require('devices.manage');
    const user = this.db.get<{ id: string }>('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL AND active = 1', [userId]);
    if (!user) throw new Error('Utilisateur introuvable');
    const port = this.opts.lanPort();
    const addresses = this.opts.lanAddresses();
    if (!port) throw new Error('Le serveur de synchronisation local est arrêté');
    if (addresses.length === 0) throw new Error("Aucun réseau local détecté : connectez le Mac au Wi-Fi de l'agence");
    const host = address && addresses.includes(address) ? address : addresses[0]!;
    this.purgeTokens();
    const token = randomBytes(24).toString('base64url');
    const expiresAt = Date.now() + PAIRING_TTL_MS;
    this.pairingTokens.set(token, { userId, expiresAt });
    const hub = `http://${host}:${port}`;
    const url = `${hub}/m/#pair=${encodePairingPayload({ v: 1, hub, token, hubId: this.deviceId })}`;
    const qrDataUrl = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 2, width: 512, color: { dark: '#111111', light: '#ffffff' } });
    return { url, qrDataUrl, expiresAt: new Date(expiresAt).toISOString(), addresses };
  }

  async revokeDevice(id: string) {
    this.require('devices.manage');
    this.db.run('UPDATE devices SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL', [new Date().toISOString(), id]);
  }

  /** Consomme un jeton d'appairage (usage unique) et enregistre l'appareil. */
  pairDevice(token: string, deviceName: string, platform: string, ip: string | null) {
    this.purgeTokens();
    const entry = this.pairingTokens.get(token);
    if (!entry) return null;
    this.pairingTokens.delete(token);
    const user = this.db.get<UserRow>('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [entry.userId]);
    if (!user) return null;
    const deviceId = `dev_${randomBytes(6).toString('hex')}`;
    const secret = randomBytes(32).toString('base64url');
    const now = new Date().toISOString();
    this.db.run(
      'INSERT INTO devices (id, name, platform, user_id, secret_hash, paired_at, last_seen_at, last_ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [deviceId, String(deviceName).slice(0, 80) || 'Appareil', String(platform).slice(0, 40), user.id, sha256(secret), now, now, ip],
    );
    const s = this.toSession(user);
    return { deviceId, secret, hubId: this.deviceId, user: { id: s.id, fullName: s.fullName, role: s.role, language: s.language } };
  }

  private purgeTokens() {
    const now = Date.now();
    for (const [k, v] of this.pairingTokens) if (v.expiresAt < now) this.pairingTokens.delete(k);
  }

  async syncStatus(): Promise<SyncStatus> {
    return { lastSyncAt: new Date().toISOString(), pendingChanges: 0, online: true, error: null };
  }
}

