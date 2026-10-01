import { StrictMode } from 'react';
import type { Root } from 'react-dom/client';
import type { AppApi, MediaItem, SyncStatus } from '@alwasset/shared/api/contract';
import type { SqlDriver } from '@alwasset/shared/db/driver';
import { getSetting } from '@alwasset/shared/db/migrate';
import type { StoreContext } from '@alwasset/shared/db/store';
import { todayIso } from '@alwasset/shared/finance/dates';
import { attachMedia, isMediaEntity, listMedia, mimeFromName, type StoredFile } from '@alwasset/shared/services/media';
import { needsSetup, setupAgency } from '@alwasset/shared/services/setup';
import { HybridClock } from '@alwasset/shared/sync/hlc';
import { AlWassetApp } from '@alwasset/shared/ui/App';
import { mobileApi } from './api';
import { openLocalDb } from './localdb';
import { deleteAll, loadBytes, saveBytes, type Credentials } from './storage';
import type { SyncClient } from './sync';

/**
 * Version de démonstration 100 % navigateur : même interface et mêmes
 * services que l'application, base SQLite locale (IndexedDB), données de
 * démo créées au premier lancement. Rien n'est envoyé à un serveur.
 */
const DEMO_DEVICE = 'demo_browser';

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Stocke un fichier dans IndexedDB (adressé par empreinte) + miniature JPEG. */
async function storeFile(file: Blob, name: string): Promise<StoredFile> {
  const bytes = await file.arrayBuffer();
  const sha = await sha256Hex(bytes);
  await saveBytes(`media:${sha}`, new Uint8Array(bytes));
  const mime = file.type || mimeFromName(name);
  let thumbSha: string | null = null;
  let width: number | null = null;
  let height: number | null = null;
  if (mime.startsWith('image/')) {
    try {
      const bmp = await createImageBitmap(file);
      width = bmp.width;
      height = bmp.height;
      const scale = Math.min(1, 640 / bmp.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      const thumb = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82));
      if (thumb) {
        const tb = await thumb.arrayBuffer();
        thumbSha = await sha256Hex(tb);
        await saveBytes(`media:${thumbSha}`, new Uint8Array(tb));
      }
    } catch {
      /* image illisible : pas de miniature */
    }
  }
  return { sha256: sha, sizeBytes: bytes.byteLength, mime, originalName: name, thumbSha256: thumbSha, width, height };
}

/** Photos d'illustration générées localement pour les biens de démo. */
async function illustration(sky: string, ground: string, roof: string): Promise<Blob> {
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 900;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 900);
  grad.addColorStop(0, sky);
  grad.addColorStop(1, '#ffffff');
  g.fillStyle = grad;
  g.fillRect(0, 0, 1200, 900);
  g.fillStyle = ground;
  g.fillRect(0, 600, 1200, 300);
  g.fillStyle = '#fafafa';
  g.fillRect(330, 290, 540, 390);
  g.fillStyle = roof;
  g.beginPath();
  g.moveTo(290, 305);
  g.lineTo(600, 110);
  g.lineTo(910, 305);
  g.fill();
  g.fillStyle = '#5a3d2b';
  g.fillRect(555, 500, 90, 180);
  g.fillStyle = '#9ec9ef';
  g.fillRect(390, 360, 115, 90);
  g.fillRect(695, 360, 115, 90);
  return new Promise((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.9));
}

async function seedPhotos(ctx: StoreContext) {
  const palette: [string, string, string, string][] = [
    ['WS-V01', '#87b5e0', '#e9d8b8', '#c8102e'],
    ['WS-A101', '#f4e3c1', '#d9b98c', '#6b8e23'],
    ['WS-A102', '#b8d8e8', '#f0f0f0', '#2f6f9f'],
    ['WS-B01', '#ffd9a0', '#c98b5a', '#444444'],
    ['WS-S01', '#cfe3f3', '#bfbfbf', '#a50d26'],
    ['WS-C01', '#e7f0d9', '#cbb38f', '#8a5a2b'],
  ];
  for (const [ref, sky, ground, roof] of palette) {
    const p = ctx.db.get<{ id: string }>('SELECT id FROM properties WHERE reference = ?', [ref]);
    if (!p) continue;
    attachMedia(ctx, 'properties', p.id, await storeFile(await illustration(sky, ground, roof), `${ref}.jpg`));
  }
}

function demoApi(db: SqlDriver, clock: HybridClock, onWrite: () => void): AppApi {
  const admin = db.get<{ id: string; full_name: string; language: string }>(
    "SELECT id, full_name, language FROM users WHERE role = 'admin' AND deleted_at IS NULL LIMIT 1",
  )!;
  const creds: Credentials = {
    hub: location.origin, deviceId: DEMO_DEVICE, secret: '', hubId: 'demo',
    user: { id: admin.id, fullName: admin.full_name, role: 'admin', language: admin.language },
  };
  const status: SyncStatus = { lastSyncAt: null, pendingChanges: 0, online: true, error: null };
  const noSync = { sync: async () => status, current: () => status } as unknown as SyncClient;
  const base = mobileApi(db, clock, creds, noSync, onWrite);
  const ctx = (): StoreContext => ({ db, clock, userId: admin.id, companyId: getSetting(db, 'company_id') ?? null, branchId: getSetting(db, 'branch_id') ?? null });
  const urls = new Map<string, string>();
  const src = async (sha: string) => {
    const hit = urls.get(sha);
    if (hit) return hit;
    const bytes = await loadBytes(`media:${sha}`);
    if (!bytes) return null;
    const mime = db.get<{ mime: string; thumb: number }>('SELECT mime, sha256 <> ? AS thumb FROM media WHERE sha256 = ? OR thumb_sha256 = ? LIMIT 1', [sha, sha, sha]);
    const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: mime?.thumb ? 'image/jpeg' : mime?.mime ?? 'application/octet-stream' }));
    urls.set(sha, url);
    return url;
  };
  return {
    ...base,
    media: {
      ...base.media,
      add: async (entity, entityId, files) => {
        if (!isMediaEntity(entity)) throw new Error('Type de fiche inconnu');
        const list = files ?? (await pick());
        for (const f of list) attachMedia(ctx(), entity, entityId, await storeFile(f, f.name));
        onWrite();
        return listMedia(db, entity, entityId) as MediaItem[];
      },
      src: (sha) => src(sha),
      open: async (id) => {
        const m = db.get<{ sha256: string }>('SELECT sha256 FROM media WHERE id = ?', [id]);
        const url = m && (await src(m.sha256));
        if (url) window.open(url, '_blank');
      },
    },
  };
}

function pick(): Promise<File[]> {
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

function DemoBar({ onReset }: { onReset(): void }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="rounded-full bg-brand-50 px-2 py-1 font-semibold text-brand-700">DEMO</span>
      <span className="hidden text-muted sm:inline">نسخة تجريبية — البيانات محفوظة في هذا المتصفح فقط</span>
      <button className="rounded-md border border-line px-2 py-1" onClick={onReset}>إعادة تعيين</button>
    </div>
  );
}

export async function startDemo(root: Root) {
  const { driver, schedulePersist, persist } = await openLocalDb();
  const clock = new HybridClock(DEMO_DEVICE);
  const ctx: StoreContext = { db: driver, clock };
  if (needsSetup(ctx)) {
    const res = setupAgency(
      ctx,
      { agencyName: 'الوسيط 777', city: 'الدار البيضاء', adminFullName: 'مدير الوكالة', adminUsername: 'admin', adminPassword: 'demo-alwasset', language: 'ar', withDemoData: true },
      () => 'demo',
      todayIso(),
    );
    await seedPhotos({ ...ctx, userId: res.adminId, companyId: res.companyId, branchId: res.branchId });
    await persist();
  }
  let version = 0;
  const reset = async () => {
    if (!confirm('إعادة البيانات التجريبية إلى حالتها الأصلية؟')) return;
    await deleteAll();
    location.reload();
  };
  const api = demoApi(driver, clock, () => {
    schedulePersist();
    version++;
    render();
  });
  function render() {
    root.render(
      <StrictMode>
        <AlWassetApp dataVersion={version} api={api} statusBar={<DemoBar onReset={() => void reset()} />} />
      </StrictMode>,
    );
  }
  render();
}
