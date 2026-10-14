import type { SyncStatus } from '@alwasset/shared/api/contract';
import type { SqlDriver } from '@alwasset/shared/db/driver';
import { getSetting, setSetting } from '@alwasset/shared/db/migrate';
import { applyChanges, localChanges, retryInbox } from '@alwasset/shared/sync/engine';
import type { HybridClock } from '@alwasset/shared/sync/hlc';
import type { PullResponse, PushResponse } from '@alwasset/shared/sync/protocol';
import type { Credentials } from './storage';

/** Client de synchronisation : push des changements locaux puis pull du hub. */
export class SyncClient {
  private running: Promise<SyncStatus> | null = null;
  private status: SyncStatus = { lastSyncAt: null, pendingChanges: 0, online: navigator.onLine, error: null };
  private listeners = new Set<(s: SyncStatus) => void>();

  constructor(
    private readonly db: SqlDriver,
    private readonly clock: HybridClock,
    private readonly creds: Credentials,
    /** Appelé après chaque synchro réussie ; `changed` si des données sont arrivées. */
    private readonly onSynced: (changed: boolean) => void,
  ) {
    this.status.lastSyncAt = getSetting(db, 'last_sync_at') ?? null;
    this.status.pendingChanges = this.pending();
  }

  subscribe(fn: (s: SyncStatus) => void) {
    this.listeners.add(fn);
    fn(this.status);
    return () => this.listeners.delete(fn);
  }

  current() {
    return this.status;
  }

  private emit(patch: Partial<SyncStatus>) {
    this.status = { ...this.status, ...patch };
    for (const l of this.listeners) l(this.status);
  }

  private pending(): number {
    const pushed = Number(getSetting(this.db, 'pushed_seq') ?? 0);
    return this.db.get<{ n: number }>('SELECT COUNT(*) AS n FROM change_log WHERE device_id = ? AND seq > ?', [this.creds.deviceId, pushed])?.n ?? 0;
  }

  private async call<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.creds.hub}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.creds.deviceId}.${this.creds.secret}`, ...init?.headers },
    });
    const body = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) throw Object.assign(new Error(body.error ?? `HTTP ${res.status}`), { status: res.status });
    return body;
  }

  sync(): Promise<SyncStatus> {
    this.running ??= this.run().finally(() => (this.running = null));
    return this.running;
  }

  private async run(): Promise<SyncStatus> {
    try {
      // 1. Push
      for (;;) {
        const after = Number(getSetting(this.db, 'pushed_seq') ?? 0);
        const out = localChanges(this.db, this.creds.deviceId, after, 1000);
        if (out.length === 0) break;
        await this.call<PushResponse>('/api/sync/push', { method: 'POST', body: JSON.stringify({ changes: out }) });
        setSetting(this.db, 'pushed_seq', String(out[out.length - 1]!.seq));
      }
      // 2. Pull
      let changed = false;
      for (;;) {
        const after = Number(getSetting(this.db, 'pulled_cursor') ?? 0);
        const page = await this.call<PullResponse>(`/api/sync/pull?after=${after}`);
        if (page.changes.length) {
          applyChanges(this.db, this.clock, page.changes);
          changed = true;
        }
        setSetting(this.db, 'pulled_cursor', String(page.cursor));
        if (!page.hasMore) break;
      }
      if (changed) retryInbox(this.db, this.clock);
      const now = new Date().toISOString();
      setSetting(this.db, 'last_sync_at', now);
      this.onSynced(changed);
      this.emit({ lastSyncAt: now, online: true, error: null, pendingChanges: this.pending() });
    } catch (err) {
      const status = (err as { status?: number }).status;
      this.emit({
        online: status !== undefined,
        error: status === 401 ? 'revoked' : err instanceof Error ? err.message : String(err),
        pendingChanges: this.pending(),
      });
    }
    return this.status;
  }
}
