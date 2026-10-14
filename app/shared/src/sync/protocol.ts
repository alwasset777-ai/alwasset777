/** Un changement de champ, tel qu'échangé entre appareils. */
export interface Change {
  seq?: number;
  tbl: string;
  row_id: string;
  col: string;
  /** Valeur encodée en JSON. */
  value: string | null;
  hlc: string;
  device_id: string;
}

export interface PullResponse {
  changes: Change[];
  /** Dernier seq renvoyé ; à repasser comme `after` au prochain appel. */
  cursor: number;
  hasMore: boolean;
}

export interface PushRequest {
  changes: Change[];
}

export interface PushResponse {
  applied: number;
  skipped: number;
  rejected: number;
}

export interface PairRequest {
  token: string;
  deviceName: string;
  platform: string;
}

export interface PairResponse {
  deviceId: string;
  secret: string;
  hubId: string;
  user: { id: string; fullName: string; role: string; language: string } | null;
}

/** Contenu encodé dans le QR code d'appairage (fragment #pair=…). */
export interface PairingPayload {
  v: 1;
  hub: string;
  token: string;
  hubId: string;
}

export function encodePairingPayload(p: PairingPayload): string {
  const json = JSON.stringify(p);
  const b64 = typeof btoa === 'function' ? btoa(json) : Buffer.from(json, 'utf8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodePairingPayload(s: string): PairingPayload {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const json = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('utf8');
  const p = JSON.parse(json) as PairingPayload;
  if (p.v !== 1 || !p.hub || !p.token || !p.hubId) throw new Error('QR code invalide');
  return p;
}
