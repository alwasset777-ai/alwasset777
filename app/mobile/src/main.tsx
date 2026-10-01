import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { SyncStatus } from '@alwasset/shared/api/contract';
import type { PairResponse } from '@alwasset/shared/sync/protocol';
import { decodePairingPayload } from '@alwasset/shared/sync/protocol';
import { HybridClock } from '@alwasset/shared/sync/hlc';
import { translate, dirOf, isLang, type Lang } from '@alwasset/shared/i18n/index';
import { AlWassetApp } from '@alwasset/shared/ui/App';
import { Logo } from '@alwasset/shared/ui/components/Logo';
import '@alwasset/shared/ui/styles.css';
import { mobileApi } from './api';
import { openLocalDb } from './localdb';
import { deleteAll, loadCredentials, saveCredentials, type Credentials } from './storage';
import { SyncClient } from './sync';

const root = createRoot(document.getElementById('root')!);
const lang: Lang = (() => {
  try {
    const l = localStorage.getItem('alwasset.lang');
    return isLang(l) ? l : 'ar';
  } catch {
    return 'ar';
  }
})();
document.documentElement.dir = dirOf(lang);

function Screen({ message, error }: { message: string; error?: string }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <Logo size={64} />
      <h1 className="text-xl font-bold">{translate(lang, 'app.name')}</h1>
      <p className="max-w-sm text-muted">{message}</p>
      {error && <p className="max-w-sm rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{error}</p>}
    </div>
  );
}

function deviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'PC Windows';
  return 'Appareil';
}

/** Appairage : le QR code ouvre /m/#pair=… ; on échange le jeton contre des identifiants. */
async function pairFromHash(): Promise<Credentials | null> {
  const m = /[#&]pair=([^&]+)/.exec(location.hash);
  if (!m) return null;
  history.replaceState(null, '', location.pathname);
  const payload = decodePairingPayload(m[1]!);
  root.render(<Screen message={translate(lang, 'mobile.pairing')} />);
  const res = await fetch(`${payload.hub}/api/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: payload.token, deviceName: deviceName(), platform: navigator.platform || 'web' }),
  });
  const body = (await res.json()) as PairResponse & { error?: string };
  if (!res.ok || !body.user) throw new Error(body.error ?? `HTTP ${res.status}`);
  // Nouvel appairage : repartir d'une base locale vide.
  await deleteAll();
  const creds: Credentials = { hub: payload.hub, deviceId: body.deviceId, secret: body.secret, hubId: body.hubId, user: body.user };
  saveCredentials(creds);
  localStorage.setItem('alwasset.lang', body.user.language);
  return creds;
}

function SyncBar({ sync, onUnpair }: { sync: SyncClient; onUnpair(): void }) {
  const [s, setS] = useState<SyncStatus>(sync.current());
  useEffect(() => {
    const off = sync.subscribe(setS);
    return () => void off();
  }, [sync]);
  const l = (localStorage.getItem('alwasset.lang') as Lang | null) ?? lang;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`h-2 w-2 rounded-full ${s.error ? 'bg-brand-600' : 'bg-green-600'}`} />
      <span className="text-muted">
        {s.error ? translate(l, 'mobile.offline') : `${translate(l, 'mobile.lastSync')}: `}
        {!s.error && s.lastSyncAt && <span className="num">{new Date(s.lastSyncAt).toLocaleTimeString()}</span>}
      </span>
      <button className="rounded-md border border-line px-2 py-1" onClick={() => void sync.sync()}>
        {translate(l, 'mobile.syncNow')}
      </button>
      <button className="px-1 text-muted" title={translate(l, 'mobile.unpair')} onClick={onUnpair}>⎋</button>
    </div>
  );
}

async function start() {
  if ('serviceWorker' in navigator && window.isSecureContext) {
    void navigator.serviceWorker.register('./sw.js');
  }
  let creds: Credentials | null;
  try {
    creds = (await pairFromHash()) ?? loadCredentials();
  } catch (err) {
    root.render(<Screen message={translate(lang, 'mobile.pairFirst')} error={err instanceof Error ? err.message : String(err)} />);
    return;
  }
  if (!creds) {
    root.render(<Screen message={translate(lang, 'mobile.pairFirst')} />);
    return;
  }

  const { driver, schedulePersist, persist } = await openLocalDb();
  const clock = new HybridClock(creds.deviceId);
  let version = 0;
  const sync = new SyncClient(driver, clock, creds, (changed) => {
    schedulePersist();
    if (changed) {
      version++;
      render();
    }
  });
  const api = mobileApi(driver, clock, creds, sync, () => {
    schedulePersist();
    version++;
    render();
  });
  const unpair = async () => {
    if (!confirm(translate(lang, 'mobile.unpair') + ' ?')) return;
    saveCredentials(null);
    await persist();
    await deleteAll();
    location.reload();
  };
  sync.subscribe((s) => {
    if (s.error === 'revoked') {
      saveCredentials(null);
      void deleteAll().then(() => location.reload());
    }
  });

  function render() {
    root.render(
      <StrictMode>
        <AlWassetApp dataVersion={version} api={api} statusBar={<SyncBar sync={sync} onUnpair={() => void unpair()} />} />
      </StrictMode>,
    );
  }
  render();
  await sync.sync();
  setInterval(() => void sync.sync(), 30_000);
  window.addEventListener('online', () => void sync.sync());
}

if (import.meta.env.VITE_DEMO === '1') void import('./demo').then((m) => m.startDemo(root));
else void start();
