import type { MediaItem, MediaKind } from '../api/contract';
import type { SqlDriver } from '../db/driver';
import { insert, softDelete, update, type StoreContext } from '../db/store';

/** Entités pouvant porter des médias, avec la permission d'écriture associée. */
export const MEDIA_ENTITIES = {
  properties: 'properties.write',
  persons: 'persons.write',
  contracts: 'contracts.write',
  maintenance_tickets: 'maintenance.write',
  partner_projects: 'partners.write',
} as const;
export type MediaEntity = keyof typeof MEDIA_ENTITIES;

export function isMediaEntity(e: string): e is MediaEntity {
  return Object.hasOwn(MEDIA_ENTITIES, e);
}

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif',
  mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/x-m4v', webm: 'video/webm',
  pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain', csv: 'text/csv',
};

export function mimeFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_MIME[ext] ?? 'application/octet-stream';
}

export function kindFromMime(mime: string): MediaKind {
  if (mime.startsWith('image/')) return 'photo';
  if (mime.startsWith('video/')) return 'video';
  return 'document';
}

export function isSha256(s: unknown): s is string {
  return typeof s === 'string' && /^[a-f0-9]{64}$/.test(s);
}

export function listMedia(db: SqlDriver, entity: string, entityId: string): MediaItem[] {
  return db
    .all<{ id: string; kind: MediaKind; title: string | null; original_name: string | null; mime: string | null; size_bytes: number | null; sha256: string; thumb_sha256: string | null; sort_order: number; created_at: string }>(
      `SELECT id, kind, title, original_name, mime, size_bytes, sha256, thumb_sha256, sort_order, created_at
       FROM media WHERE entity = ? AND entity_id = ? AND deleted_at IS NULL ORDER BY sort_order, created_at`,
      [entity, entityId],
    )
    .map((m) => ({
      id: m.id, kind: m.kind, title: m.title, originalName: m.original_name, mime: m.mime, sizeBytes: m.size_bytes,
      sha256: m.sha256, hasThumb: m.thumb_sha256 !== null, sortOrder: m.sort_order, createdAt: m.created_at,
    }));
}

export interface StoredFile {
  sha256: string;
  sizeBytes: number;
  mime: string;
  originalName: string;
  thumbSha256: string | null;
  width?: number | null;
  height?: number | null;
}

/** Rattache un fichier déjà stocké à une entité. Un même fichier n'est pas ajouté deux fois. */
export function attachMedia(ctx: StoreContext, entity: MediaEntity, entityId: string, f: StoredFile): string {
  return ctx.db.transaction(() => {
    const existing = ctx.db.get<{ id: string }>(
      'SELECT id FROM media WHERE entity = ? AND entity_id = ? AND sha256 = ? AND deleted_at IS NULL',
      [entity, entityId, f.sha256],
    );
    if (existing) return existing.id;
    const next =
      ctx.db.get<{ n: number | null }>('SELECT MAX(sort_order) AS n FROM media WHERE entity = ? AND entity_id = ? AND deleted_at IS NULL', [entity, entityId])!.n ?? -1;
    return insert(ctx, 'media', {
      entity, entity_id: entityId, kind: kindFromMime(f.mime), title: f.originalName.replace(/\.[^.]+$/, ''),
      original_name: f.originalName, mime: f.mime, size_bytes: f.sizeBytes, sha256: f.sha256,
      thumb_sha256: f.thumbSha256, width: f.width ?? null, height: f.height ?? null, sort_order: next + 1,
    });
  });
}

export function removeMedia(ctx: StoreContext, id: string): void {
  softDelete(ctx, 'media', id);
}

/** Réordonne (la première photo devient la photo de couverture). */
export function reorderMedia(ctx: StoreContext, entity: string, entityId: string, orderedIds: string[]): void {
  ctx.db.transaction(() => {
    const current = listMedia(ctx.db, entity, entityId);
    orderedIds.forEach((id, i) => {
      const m = current.find((c) => c.id === id);
      if (m && m.sortOrder !== i) update(ctx, 'media', id, { sort_order: i });
    });
  });
}

export function mediaEntityOf(db: SqlDriver, id: string): { entity: string; entityId: string; sha256: string } | undefined {
  return db.get<{ entity: string; entityId: string; sha256: string }>(
    'SELECT entity, entity_id AS entityId, sha256 FROM media WHERE id = ? AND deleted_at IS NULL',
    [id],
  );
}
