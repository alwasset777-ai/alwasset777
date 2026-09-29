import type { Lang } from '../i18n/index';
import type { Role } from '../auth/permissions';

/**
 * Contrat unique entre l'interface et les données. Implémenté :
 *  - sur le bureau par le processus principal Electron (via IPC) ;
 *  - sur mobile directement sur la base locale sql.js.
 */
export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  language: Lang;
  mustChangePassword: boolean;
}

export interface SetupInput {
  agencyName: string;
  city: string;
  adminFullName: string;
  adminUsername: string;
  adminPassword: string;
  language: Lang;
  withDemoData: boolean;
}

export interface Kpis {
  propertiesTotal: number;
  byStatus: Record<string, number>;
  occupancyRateBp: number;
  activeContracts: number;
  overdueCents: number;
  overdueCount: number;
  dueNext30Cents: number;
  collectedThisMonthCents: number;
  upcoming: { contractRef: string; personName: string; dueDate: string; outstandingCents: number }[];
}

export interface PropertyListItem {
  id: string;
  reference: string | null;
  title: string | null;
  type: string | null;
  status: string;
  city: string | null;
  district: string | null;
  areaM2: number | null;
  priceSaleCents: number | null;
  priceRentCents: number | null;
  parentTitle: string | null;
}

export interface PropertyFilters {
  q?: string;
  status?: string;
  type?: string;
  city?: string;
}

export interface DeviceInfo {
  id: string;
  name: string;
  platform: string | null;
  userName: string | null;
  pairedAt: string;
  lastSeenAt: string | null;
  lastIp: string | null;
  revoked: boolean;
}

export interface PairingOffer {
  url: string;
  qrDataUrl: string;
  expiresAt: string;
  addresses: string[];
}

export interface UserListItem {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  active: boolean;
}

export interface SyncStatus {
  lastSyncAt: string | null;
  pendingChanges: number;
  online: boolean;
  error: string | null;
}

export interface AppApi {
  platform: 'desktop' | 'mobile';
  app: {
    needsSetup(): Promise<boolean>;
    setup(input: SetupInput): Promise<void>;
    info(): Promise<{ version: string; agencyName: string; hubId: string }>;
  };
  auth: {
    current(): Promise<SessionUser | null>;
    login(username: string, password: string): Promise<SessionUser>;
    logout(): Promise<void>;
    changePassword(oldPassword: string, newPassword: string): Promise<void>;
    setLanguage(lang: Lang): Promise<void>;
  };
  dashboard: { kpis(): Promise<Kpis> };
  properties: { list(filters: PropertyFilters): Promise<PropertyListItem[]> };
  users: { list(): Promise<UserListItem[]> };
  devices: {
    list(): Promise<DeviceInfo[]>;
    createPairing(userId: string, address?: string): Promise<PairingOffer>;
    revoke(id: string): Promise<void>;
  };
  sync: { status(): Promise<SyncStatus>; now(): Promise<SyncStatus> };
}
