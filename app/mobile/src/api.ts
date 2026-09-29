import type { AppApi, MediaItem, SessionUser } from '@alwasset/shared/api/contract';
import { can, isRole, type Permission } from '@alwasset/shared/auth/permissions';
import type { SqlDriver } from '@alwasset/shared/db/driver';
import type { StoreContext } from '@alwasset/shared/db/store';
import { todayIso } from '@alwasset/shared/finance/dates';
import { isLang } from '@alwasset/shared/i18n/index';
import { computeKpis } from '@alwasset/shared/services/dashboard';
import { isMediaEntity, listMedia, MEDIA_ENTITIES, mediaEntityOf, removeMedia, reorderMedia } from '@alwasset/shared/services/media';
import {
  createProperty, deleteProperty, getProperty, listCities, listCustomFields, listProperties, removeCustomField,
  saveCustomField, searchPersons, setOwners, setPropertyStatus, updateProperty,
} from '@alwasset/shared/services/properties';
import { listUsers } from '@alwasset/shared/services/users';
import type { HybridClock } from '@alwasset/shared/sync/hlc';
import type { Credentials } from './storage';
import type { SyncClient } from './sync';

/** Ouvre le sélecteur de fichiers du téléphone (appareil photo, galerie, fichiers). */
function pickFiles(): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,video/*,application/pdf';
    input.onchange = () => resolve(Array.from(input.files ?? []));
    input.oncancel = () => resolve([]);
    input.click();
  });
}

/**
 * API mobile : lit et écrit directement la base locale (hors ligne) ; les
 * écritures partent au Mac à la synchro suivante. L'identité est celle de
 * l'utilisateur choisi lors de l'appairage. Les droits sont vérifiés ici
 * aussi, pour ne jamais créer localement un changement que le Mac refuserait.
 */
export function mobileApi(db: SqlDriver, clock: HybridClock, creds: Credentials, sync: SyncClient, onWrite: () => void): AppApi {
  const user: SessionUser = {
    id: creds.user.id,
    username: '',
    fullName: creds.user.fullName,
    role: isRole(creds.user.role) ? creds.user.role : 'sales',
    language: isLang(creds.user.language) ? creds.user.language : 'ar',
    mustChangePassword: false,
  };
  const ctx = (): StoreContext => ({
    db,
    clock,
    userId: user.id,
    companyId: db.get<{ id: string }>('SELECT id FROM companies WHERE deleted_at IS NULL LIMIT 1')?.id ?? null,
    branchId: db.get<{ id: string }>('SELECT id FROM branches WHERE deleted_at IS NULL LIMIT 1')?.id ?? null,
  });
  const require = (p: Permission) => {
    if (!can(user.role, p)) throw new Error('Accès refusé');
  };
  /** Écriture locale puis synchro en arrière-plan. */
  const write = <T>(p: Permission, fn: () => T): Promise<T> => {
    require(p);
    const result = fn();
    onWrite();
    void sync.sync();
    return Promise.resolve(result);
  };
  const desktopOnly = () => Promise.reject(new Error('Disponible uniquement sur le Mac'));
  const authHeader = { Authorization: `Bearer ${creds.deviceId}.${creds.secret}` };
  const blobCache = new Map<string, string>();

  const src = async (sha: string): Promise<string | null> => {
    const hit = blobCache.get(sha);
    if (hit) return hit;
    try {
      const res = await fetch(`${creds.hub}/api/media/${sha}`, { headers: authHeader });
      if (!res.ok) return null;
      const url = URL.createObjectURL(await res.blob());
      blobCache.set(sha, url);
      return url;
    } catch {
      return null; // hors ligne : l'interface affiche un espace réservé
    }
  };

  return {
    platform: 'mobile',
    app: {
      needsSetup: async () => false,
      setup: desktopOnly,
      info: async () => ({
        version: '0.2.0',
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
    properties: {
      list: async (f) => listProperties(db, f),
      get: async (id) => getProperty(db, id),
      create: (input) => write('properties.write', () => createProperty(ctx(), input)),
      update: (id, input) => write('properties.write', () => updateProperty(ctx(), id, input)),
      setStatus: (id, s) => write('properties.write', () => setPropertyStatus(ctx(), id, s)),
      remove: (id) => write('properties.write', () => deleteProperty(ctx(), id)),
      cities: async () => listCities(db),
      setOwners: (id, owners) => write('properties.write', () => setOwners(ctx(), id, owners)),
    },
    persons: { search: async (q) => searchPersons(db, q) },
    customFields: {
      list: async (e) => listCustomFields(db, e),
      save: (d) => write('settings.manage', () => saveCustomField(ctx(), d)),
      remove: (id) => write('settings.manage', () => removeCustomField(ctx(), id)),
    },
    media: {
      list: async (e, id) => listMedia(db, e, id),
      add: async (entity, entityId, files) => {
        if (!isMediaEntity(entity)) throw new Error('Type de fiche inconnu');
        require(MEDIA_ENTITIES[entity]);
        const list = files ?? (await pickFiles());
        // L'envoi se fait directement vers le Mac, qui enregistre la fiche média.
        for (const f of list) {
          const url = `${creds.hub}/api/media?entity=${entity}&entityId=${encodeURIComponent(entityId)}&name=${encodeURIComponent(f.name)}`;
          const res = await fetch(url, { method: 'POST', headers: authHeader, body: f });
          if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? `HTTP ${res.status}`);
        }
        await sync.sync();
        return listMedia(db, entity, entityId);
      },
      remove: async (id) => {
        const m = mediaEntityOf(db, id);
        if (!m || !isMediaEntity(m.entity)) return;
        await write(MEDIA_ENTITIES[m.entity], () => removeMedia(ctx(), id));
      },
      reorder: async (entity, entityId, ids) => {
        if (!isMediaEntity(entity)) return;
        await write(MEDIA_ENTITIES[entity], () => reorderMedia(ctx(), entity, entityId, ids));
      },
      src: (sha) => src(sha),
      open: async (id) => {
        const m = db.get<{ sha256: string }>('SELECT sha256 FROM media WHERE id = ?', [id]);
        const url = m && (await src(m.sha256));
        if (!url) throw new Error('Fichier indisponible hors connexion');
        window.open(url, '_blank');
      },
    },
    users: { list: async () => listUsers(db) },
    devices: { list: async () => [], createPairing: desktopOnly, revoke: desktopOnly },
    sync: { status: async () => sync.current(), now: () => sync.sync() },
  } satisfies AppApi & { media: { add(e: string, id: string, f?: File[]): Promise<MediaItem[]> } };
}
