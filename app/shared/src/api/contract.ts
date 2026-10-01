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

export const PROPERTY_TYPES = ['tower', 'building', 'apartment', 'villa', 'office', 'commercial', 'shop', 'showroom', 'land', 'other'] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];
export const PROPERTY_STATUSES = ['available', 'reserved', 'rented', 'sold', 'maintenance'] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];
export const PROPERTY_PURPOSES = ['rent', 'sale', 'both'] as const;
export type PropertyPurpose = (typeof PROPERTY_PURPOSES)[number];
/** Types qui regroupent des lots (appartements, bureaux…). */
export const CONTAINER_TYPES: readonly PropertyType[] = ['tower', 'building'];

export interface PropertyListItem {
  id: string;
  reference: string | null;
  title: string | null;
  type: string | null;
  status: string;
  purpose: string | null;
  city: string | null;
  district: string | null;
  areaM2: number | null;
  rooms: number | null;
  priceSaleCents: number | null;
  priceRentCents: number | null;
  parentId: string | null;
  parentTitle: string | null;
  unitsCount: number;
  coverSha: string | null;
}

export interface PropertyFilters {
  q?: string;
  status?: string;
  type?: string;
  city?: string;
  purpose?: 'rent' | 'sale';
  /** Bornes de prix en centimes, appliquées au loyer ou au prix de vente selon `purpose`. */
  priceMinCents?: number;
  priceMaxCents?: number;
  areaMin?: number;
  areaMax?: number;
  roomsMin?: number;
  parentId?: string;
  /** Masque les lots d'un immeuble (n'affiche que les biens de premier niveau). */
  topLevelOnly?: boolean;
  sort?: 'recent' | 'price_asc' | 'price_desc' | 'area_desc' | 'reference';
}

/** Données saisies dans le formulaire d'un bien (montants en centimes). */
export interface PropertyInput {
  reference?: string | null;
  title: string;
  type: PropertyType;
  status: PropertyStatus;
  purpose: PropertyPurpose;
  parentId?: string | null;
  priceSaleCents?: number | null;
  priceRentCents?: number | null;
  areaM2?: number | null;
  landAreaM2?: number | null;
  rooms?: number | null;
  bathrooms?: number | null;
  floor?: number | null;
  yearBuilt?: number | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  titleDeed?: string | null;
  description?: string | null;
  attributes?: Record<string, string | number | boolean | null>;
}

export interface PropertyOwner {
  personId: string;
  name: string;
  phone: string | null;
  shareBp: number;
}

export interface PropertyDetail extends PropertyInput {
  id: string;
  reference: string | null;
  parentTitle: string | null;
  createdAt: string;
  updatedAt: string;
  owners: PropertyOwner[];
  units: PropertyListItem[];
  activeContract: { id: string; reference: string | null; type: string | null; endDate: string | null } | null;
}

export interface PersonLookup {
  id: string;
  name: string;
  phone: string | null;
}

export type CustomFieldType = 'text' | 'number' | 'boolean' | 'date' | 'select';

export interface CustomFieldDef {
  id?: string;
  entity: 'properties';
  key: string;
  labelAr: string;
  labelFr: string;
  labelEn: string;
  fieldType: CustomFieldType;
  options: string[];
}

export type MediaKind = 'photo' | 'video' | 'document';

export interface MediaItem {
  id: string;
  kind: MediaKind;
  title: string | null;
  originalName: string | null;
  mime: string | null;
  sizeBytes: number | null;
  sha256: string;
  hasThumb: boolean;
  sortOrder: number;
  createdAt: string;
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
  properties: {
    list(filters: PropertyFilters): Promise<PropertyListItem[]>;
    get(id: string): Promise<PropertyDetail>;
    create(input: PropertyInput): Promise<string>;
    update(id: string, input: PropertyInput): Promise<void>;
    setStatus(id: string, status: PropertyStatus): Promise<void>;
    remove(id: string): Promise<void>;
    cities(): Promise<string[]>;
    setOwners(id: string, owners: { personId: string; shareBp: number }[]): Promise<void>;
  };
  persons: { search(q: string): Promise<PersonLookup[]> };
  customFields: {
    list(entity: 'properties'): Promise<CustomFieldDef[]>;
    save(def: CustomFieldDef): Promise<string>;
    remove(id: string): Promise<void>;
  };
  media: {
    list(entity: string, entityId: string): Promise<MediaItem[]>;
    /** Ajoute des fichiers (sélecteur du système si `files` est absent). */
    add(entity: string, entityId: string, files?: File[]): Promise<MediaItem[]>;
    remove(id: string): Promise<void>;
    reorder(entity: string, entityId: string, orderedIds: string[]): Promise<void>;
    /** URL affichable (miniature ou original) ; null si indisponible hors ligne. */
    src(sha256: string, variant: 'thumb' | 'full'): Promise<string | null>;
    open(id: string): Promise<void>;
  };
  users: { list(): Promise<UserListItem[]> };
  devices: {
    list(): Promise<DeviceInfo[]>;
    createPairing(userId: string, address?: string): Promise<PairingOffer>;
    revoke(id: string): Promise<void>;
  };
  sync: { status(): Promise<SyncStatus>; now(): Promise<SyncStatus> };
}
