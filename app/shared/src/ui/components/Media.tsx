import { useEffect, useState } from 'react';
import { useApi } from '../api';
import { cx } from './ui';

/** Image d'un média (miniature ou original), avec espace réservé si indisponible. */
export function MediaImage({ sha, variant = 'thumb', alt = '', className }: { sha: string | null; variant?: 'thumb' | 'full'; alt?: string; className?: string }) {
  const api = useApi();
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setSrc(null);
    if (sha) void api.media.src(sha, variant).then((s) => alive && setSrc(s));
    return () => {
      alive = false;
    };
  }, [api, sha, variant]);
  if (!src) return <Placeholder className={className} />;
  return <img src={src} alt={alt} loading="lazy" className={cx(!className?.includes('object-contain') && 'object-cover', className)} />;
}

export function Placeholder({ className }: { className?: string }) {
  return (
    <div className={cx('flex items-center justify-center bg-canvas text-muted', className)}>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
      </svg>
    </div>
  );
}

export function formatBytes(n: number | null): string {
  if (n == null) return '';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
