import type { AppApi, SessionUser } from '@alwasset/shared/api/contract';
import { isRole } from '@alwasset/shared/auth/permissions';
import type { SqlDriver } from '@alwasset/shared/db/driver';
import { todayIso } from '@alwasset/shared/finance/dates';
import { isLang } from '@alwasset/shared/i18n/index';
import { computeKpis } from '@alwasset/shared/services/dashboard';
import { listProperties } from '@alwasset/shared/services/properties';
import { listUsers } from '@alwasset/shared/services/users';
import type { Credentials } from './storage';
import type { SyncClient } from './sync';

/**
 * API mobile : lit directement la base locale (hors ligne). L'identité est
 * celle de l'utilisateur choisi au moment de l'appairage sur le Mac.
 */
export function mobileApi(db: SqlDriver, creds: Credentials, sync: SyncClient): AppApi {
  const user: SessionUser = {
    id: creds.user.id,
    username: '',
    fullName: creds.user.fullName,
    role: isRole(creds.user.role) ? creds.user.role : 'sales',
    language: isLang(creds.user.language) ? creds.user.language : 'ar',
    mustChangePassword: false,
  };
  const desktopOnly = () => Promise.reject(new Error('Disponible uniquement sur le Mac'));
  return {
    platform: 'mobile',
    app: {
      needsSetup: async () => false,
      setup: desktopOnly,
      info: async () => ({
        version: '0.1.0',
        agencyName: db.get<{ name: string }>('SELECT name FROM companies WHERE deleted_at IS NULL LIMIT 1')?.name ?? '',
        hubId: creds.hubId,
      }),
    },
    auth: {
      current: async () => user,
      login: desktopOnly,
      logout: async () => undefined,
      changePassword: desktopOnly,
      setLanguage: async (lang) => {
        if (isLang(lang)) {
          user.language = lang;
          creds.user.language = lang;
        }
      },
    },
    dashboard: { kpis: async () => computeKpis(db, todayIso()) },
    properties: { list: async (f) => listProperties(db, f) },
    users: { list: async () => listUsers(db) },
    devices: { list: async () => [], createPairing: desktopOnly, revoke: desktopOnly },
    sync: { status: async () => sync.current(), now: () => sync.sync() },
  };
}
