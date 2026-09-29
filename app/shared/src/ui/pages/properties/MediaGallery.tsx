import { useEffect, useState, type DragEvent } from 'react';
import type { MediaItem } from '../../../api/contract';
import { errorMessage, useApi, useAsync } from '../../api';
import { formatBytes, MediaImage } from '../../components/Media';
import { Alert, Button, Card, cx } from '../../components/ui';
import { useI18n } from '../../i18n';

/** Photos, vidéos et documents d'une fiche, avec glisser-déposer. */
export function MediaGallery({ entity, entityId, canWrite }: { entity: string; entityId: string; canWrite: boolean }) {
  const api = useApi();
  const { t } = useI18n();
  const { data, reload } = useAsync(() => api.media.list(entity, entityId), [entity, entityId]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [drag, setDrag] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);

  const photos = data?.filter((m) => m.kind === 'photo') ?? [];
  const videos = data?.filter((m) => m.kind === 'video') ?? [];
  const docs = data?.filter((m) => m.kind === 'document') ?? [];

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
      reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDrag(false);
    if (!canWrite) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length) void run(() => api.media.add(entity, entityId, files));
  }

  const setCover = (m: MediaItem) => run(() => api.media.reorder(entity, entityId, [m.id, ...(data ?? []).filter((x) => x.id !== m.id).map((x) => x.id)]));
  const remove = (m: MediaItem) => confirm(`${t('common.delete')} « ${m.originalName ?? m.title ?? ''} » ?`) && run(() => api.media.remove(m.id));

  return (
    <Card
      title={`${t('detail.photos')} · ${t('detail.videos')} · ${t('detail.documents')}`}
      actions={canWrite && <Button variant="secondary" disabled={busy} onClick={() => void run(() => api.media.add(entity, entityId))}>+ {t('detail.addFiles')}</Button>}
    >
      <div
        onDragOver={(e) => { e.preventDefault(); if (canWrite) setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={cx('space-y-5 rounded-lg', drag && 'outline-dashed outline-2 outline-offset-4 outline-brand-600')}
      >
        {error && <Alert>{error}</Alert>}
        {busy && <Alert kind="info">{t('detail.uploading')}</Alert>}
        {data && data.length === 0 && (
          <div className="rounded-lg border-2 border-dashed border-line py-10 text-center text-sm text-muted">
            {canWrite ? t('detail.dropHere') : t('detail.noMedia')}
          </div>
        )}

        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((m, i) => (
              <figure key={m.id} className="group relative overflow-hidden rounded-lg border border-line">
                <button className="block w-full" onClick={() => setViewer(i)}>
                  <MediaImage sha={m.sha256} className="aspect-[4/3] w-full" alt={m.title ?? ''} />
                </button>
                {i === 0 && <span className="absolute start-2 top-2 rounded bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">{t('detail.cover')}</span>}
                {canWrite && (
                  <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/55 p-1 text-xs text-white opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                    {i > 0 ? <button className="px-1" onClick={() => void setCover(m)}>{t('detail.setCover')}</button> : <span />}
                    <button className="px-1" onClick={() => void remove(m)}>{t('common.delete')}</button>
                  </div>
                )}
              </figure>
            ))}
          </div>
        )}

        {videos.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {videos.map((m) => <VideoItem key={m.id} m={m} canWrite={canWrite} onRemove={() => void remove(m)} />)}
          </div>
        )}

        {docs.length > 0 && (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {docs.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-700">{(m.originalName ?? '').split('.').pop()}</span>
                  <span className="truncate">{m.originalName}</span>
                  <span className="num shrink-0 text-xs text-muted">{formatBytes(m.sizeBytes)}</span>
                </span>
                <span className="flex shrink-0 gap-2">
                  <Button variant="ghost" onClick={() => void run(() => api.media.open(m.id))}>{t('detail.open')}</Button>
                  {canWrite && <Button variant="ghost" onClick={() => void remove(m)}>{t('common.delete')}</Button>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {viewer !== null && photos[viewer] && (
        <Lightbox photos={photos} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} />
      )}
    </Card>
  );
}

function VideoItem({ m, canWrite, onRemove }: { m: MediaItem; canWrite: boolean; onRemove(): void }) {
  const api = useApi();
  const { t } = useI18n();
  const [src, setSrc] = useState<string | null>(null);
  // Sur le Mac, lecture directe ; sur mobile, la vidéo n'est téléchargée qu'à la demande.
  useEffect(() => {
    if (api.platform === 'desktop') void api.media.src(m.sha256, 'full').then(setSrc);
  }, [api, m.sha256]);
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      {src ? <video src={src} controls preload="metadata" className="aspect-video w-full bg-black" /> : (
        <button className="flex aspect-video w-full items-center justify-center bg-ink text-white" onClick={() => void api.media.open(m.id)}>▶ {t('detail.open')}</button>
      )}
      <div className="flex items-center justify-between px-3 py-2 text-sm">
        <span className="truncate">{m.originalName} <span className="num text-xs text-muted">{formatBytes(m.sizeBytes)}</span></span>
        {canWrite && <button className="text-xs text-muted hover:text-brand-600" onClick={onRemove}>{t('common.delete')}</button>}
      </div>
    </div>
  );
}

function Lightbox({ photos, index, onIndex, onClose }: { photos: MediaItem[]; index: number; onIndex(i: number): void; onClose(): void }) {
  const { dir } = useI18n();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      const next = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
      const prev = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === next) onIndex((index + 1) % photos.length);
      if (e.key === prev) onIndex((index - 1 + photos.length) % photos.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dir, index, photos.length, onIndex, onClose]);
  const m = photos[index]!;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={onClose} role="dialog">
      <MediaImage sha={m.sha256} variant="full" className="max-h-full max-w-full object-contain" alt={m.title ?? ''} />
      <div className="num absolute bottom-4 text-sm text-white">{index + 1} / {photos.length}</div>
    </div>
  );
}
