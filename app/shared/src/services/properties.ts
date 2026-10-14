import {
  CONTAINER_TYPES,
  PROPERTY_PURPOSES,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  type CustomFieldDef,
  type PersonLookup,
  type PropertyDetail,
  type PropertyFilters,
  type PropertyInput,
  type PropertyListItem,
  type PropertyStatus,
  type PropertyType,
} from '../api/contract';
import type { SqlDriver, SqlValue } from '../db/driver';
import { insert, softDelete, update, type Row, type StoreContext } from '../db/store';
import { likeEscape, normalizeSearch, searchTerms } from '../text/normalize';

/** Erreur de validation : `fields` associe chaque champ fautif à un code i18n. */
export class ValidationError extends Error {
  constructor(readonly fields: Record<string, string>) {
    super(`Validation : ${Object.entries(fields).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  }
}

const REF_PREFIX: Record<PropertyType, string> = {
  tower: 'T', building: 'IM', apartment: 'A', villa: 'V', office: 'B',
  commercial: 'C', shop: 'M', showroom: 'S', land: 'L', other: 'X',
};

/** Prochaine référence libre pour un type, ex. « WS-A104 ». */
export function nextReference(db: SqlDriver, type: PropertyType): string {
  const prefix = `WS-${REF_PREFIX[type]}`;
  const rows = db.all<{ reference: string }>(
    `SELECT reference FROM properties WHERE reference LIKE ? ESCAPE '\\'`,
    [`${likeEscape(prefix)}%`],
  );
  let max = 0;
  for (const r of rows) {
    const m = new RegExp(`^${prefix}(\\d+)$`).exec(r.reference);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}${String(max + 1).padStart(2, '0')}`;
}

const isInt = (v: unknown) => typeof v === 'number' && Number.isInteger(v);
const isNonNeg = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** Valide la saisie ; lève ValidationError avec les champs fautifs. */
export function validateProperty(db: SqlDriver, input: PropertyInput, selfId?: string): void {
  const e: Record<string, string> = {};
  if (!input.title?.trim()) e.title = 'required';
  if (!PROPERTY_TYPES.includes(input.type)) e.type = 'invalid';
  if (!PROPERTY_STATUSES.includes(input.status)) e.status = 'invalid';
  if (!PROPERTY_PURPOSES.includes(input.purpose)) e.purpose = 'invalid';
  for (const k of ['priceSaleCents', 'priceRentCents'] as const) {
    const v = input[k];
    if (v != null && (!isInt(v) || v < 0)) e[k] = 'invalid';
  }
  if (input.purpose !== 'sale' && input.priceRentCents == null && !CONTAINER_TYPES.includes(input.type)) e.priceRentCents = 'required';
  if (input.purpose !== 'rent' && input.priceSaleCents == null && !CONTAINER_TYPES.includes(input.type)) e.priceSaleCents = 'required';
  for (const k of ['areaM2', 'landAreaM2'] as const) if (input[k] != null && !isNonNeg(input[k])) e[k] = 'invalid';
  for (const k of ['rooms', 'bathrooms'] as const) if (input[k] != null && (!isInt(input[k]) || input[k]! < 0)) e[k] = 'invalid';
  if (input.floor != null && !isInt(input.floor)) e.floor = 'invalid';
  if (input.yearBuilt != null && (!isInt(input.yearBuilt) || input.yearBuilt < 1800 || input.yearBuilt > 2100)) e.yearBuilt = 'invalid';
  const hasLat = input.latitude != null;
  const hasLng = input.longitude != null;
  if (hasLat !== hasLng) e.latitude = 'invalid';
  if (hasLat && (Math.abs(input.latitude!) > 90 || Math.abs(input.longitude!) > 180)) e.latitude = 'invalid';
  if (input.parentId) {
    if (input.parentId === selfId) e.parentId = 'invalid';
    else {
      const parent = db.get<{ type: string }>('SELECT type FROM properties WHERE id = ? AND deleted_at IS NULL', [input.parentId]);
      if (!parent || !CONTAINER_TYPES.includes(parent.type as PropertyType)) e.parentId = 'invalid';
    }
    if (CONTAINER_TYPES.includes(input.type)) e.parentId = 'invalid';
  }
  if (input.reference) {
    const dup = db.get(
      'SELECT 1 FROM properties WHERE reference = ? AND deleted_at IS NULL AND id IS NOT ?',
      [input.reference.trim(), selfId ?? null],
    );
    if (dup) e.reference = 'duplicate';
  }
  if (input.attributes) {
    const defs = listCustomFields(db, 'properties');
    for (const [key, value] of Object.entries(input.attributes)) {
      const def = defs.find((d) => d.key === key);
      if (!def) e[`attr.${key}`] = 'unknown';
      else if (value !== null && value !== '' && !customValueOk(def, value)) e[`attr.${key}`] = 'invalid';
    }
  }
  if (Object.keys(e).length) throw new ValidationError(e);
}

function customValueOk(def: CustomFieldDef, v: string | number | boolean): boolean {
  switch (def.fieldType) {
    case 'number': return typeof v === 'number' && Number.isFinite(v);
    case 'boolean': return typeof v === 'boolean';
    case 'date': return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
    case 'select': return typeof v === 'string' && def.options.includes(v);
    default: return typeof v === 'string';
  }
}

function toRow(input: PropertyInput): Row {
  const trim = (s: string | null | undefined) => (s?.trim() ? s.trim() : null);
  const attrs = Object.fromEntries(Object.entries(input.attributes ?? {}).filter(([, v]) => v !== null && v !== ''));
  return {
    title: input.title.trim(),
    type: input.type,
    status: input.status,
    purpose: input.purpose,
    parent_id: input.parentId || null,
    price_sale_cents: input.priceSaleCents ?? null,
    price_rent_cents: input.priceRentCents ?? null,
    area_m2: input.areaM2 ?? null,
    land_area_m2: input.landAreaM2 ?? null,
    rooms: input.rooms ?? null,
    bathrooms: input.bathrooms ?? null,
    floor: input.floor ?? null,
    year_built: input.yearBuilt ?? null,
    address: trim(input.address),
    city: trim(input.city),
    district: trim(input.district),
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    title_deed: trim(input.titleDeed),
    description: trim(input.description),
    attributes_json: Object.keys(attrs).length ? JSON.stringify(attrs) : null,
  };
}

function searchTextOf(row: Row, reference: string | null): string {
  return normalizeSearch(
    [reference, row.title, row.city, row.district, row.address, row.title_deed, row.description]
      .filter((v) => typeof v === 'string' && v)
      .join(' '),
  );
}

export function createProperty(ctx: StoreContext, input: PropertyInput): string {
  return ctx.db.transaction(() => {
    validateProperty(ctx.db, input);
    const reference = input.reference?.trim() || nextReference(ctx.db, input.type);
    const row = toRow(input);
    return insert(ctx, 'properties', { ...row, reference, search_text: searchTextOf(row, reference) });
  });
}

export function updateProperty(ctx: StoreContext, id: string, input: PropertyInput): void {
  ctx.db.transaction(() => {
    const current = ctx.db.get<{ reference: string | null }>('SELECT reference FROM properties WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!current) throw new Error('Bien introuvable');
    validateProperty(ctx.db, input, id);
    const reference = input.reference?.trim() || current.reference || nextReference(ctx.db, input.type);
    const row = toRow(input);
    // Seuls les champs réellement modifiés sont écrits (et donc synchronisés).
    const before = ctx.db.get<Record<string, unknown>>('SELECT * FROM properties WHERE id = ?', [id])!;
    const next: Row = { ...row, reference, search_text: searchTextOf(row, reference) };
    const patch: Row = {};
    for (const [k, v] of Object.entries(next)) if ((before[k] ?? null) !== (v ?? null)) patch[k] = v;
    if (Object.keys(patch).length) update(ctx, 'properties', id, patch);
  });
}

export function setPropertyStatus(ctx: StoreContext, id: string, status: PropertyStatus): void {
  if (!PROPERTY_STATUSES.includes(status)) throw new ValidationError({ status: 'invalid' });
  update(ctx, 'properties', id, { status });
}

/** Suppression douce, refusée si le bien a des lots ou un contrat actif. */
export function deleteProperty(ctx: StoreContext, id: string): void {
  ctx.db.transaction(() => {
    const units = ctx.db.get<{ n: number }>('SELECT COUNT(*) AS n FROM properties WHERE parent_id = ? AND deleted_at IS NULL', [id])!.n;
    if (units > 0) throw new ValidationError({ delete: 'hasUnits' });
    const active = ctx.db.get(
      `SELECT 1 FROM contracts WHERE property_id = ? AND deleted_at IS NULL AND status IN ('draft', 'active') LIMIT 1`,
      [id],
    );
    if (active) throw new ValidationError({ delete: 'hasContract' });
    softDelete(ctx, 'properties', id);
  });
}

const LIST_SELECT = `
  SELECT p.id, p.reference, p.title, p.type, p.status, p.purpose, p.city, p.district,
         p.area_m2 AS areaM2, p.rooms, p.price_sale_cents AS priceSaleCents, p.price_rent_cents AS priceRentCents,
         p.parent_id AS parentId, parent.title AS parentTitle,
         (SELECT COUNT(*) FROM properties u WHERE u.parent_id = p.id AND u.deleted_at IS NULL) AS unitsCount,
         (SELECT m.sha256 FROM media m WHERE m.entity = 'properties' AND m.entity_id = p.id
            AND m.kind = 'photo' AND m.deleted_at IS NULL ORDER BY m.sort_order, m.created_at LIMIT 1) AS coverSha
  FROM properties p LEFT JOIN properties parent ON parent.id = p.parent_id`;

/** Recherche avancée : texte (arabe normalisé), type, statut, ville, prix, surface, pièces. */
export function listProperties(db: SqlDriver, f: PropertyFilters = {}): PropertyListItem[] {
  const where = ['p.deleted_at IS NULL'];
  const params: SqlValue[] = [];
  const add = (sql: string, ...v: SqlValue[]) => {
    where.push(sql);
    params.push(...v);
  };
  if (f.status) add('p.status = ?', f.status);
  if (f.type) add('p.type = ?', f.type);
  if (f.city) add('p.city = ?', f.city);
  if (f.parentId) add('p.parent_id = ?', f.parentId);
  if (f.topLevelOnly) where.push('p.parent_id IS NULL');
  if (f.purpose) add(`p.purpose IN (?, 'both')`, f.purpose);
  const priceCol = f.purpose === 'rent' ? 'p.price_rent_cents' : 'p.price_sale_cents';
  if (f.priceMinCents != null) add(`${priceCol} >= ?`, f.priceMinCents);
  if (f.priceMaxCents != null) add(`${priceCol} <= ?`, f.priceMaxCents);
  if (f.areaMin != null) add('p.area_m2 >= ?', f.areaMin);
  if (f.areaMax != null) add('p.area_m2 <= ?', f.areaMax);
  if (f.roomsMin != null) add('p.rooms >= ?', f.roomsMin);
  for (const term of searchTerms(f.q)) add(`p.search_text LIKE ? ESCAPE '\\'`, `%${likeEscape(term)}%`);

  const order = {
    recent: 'p.created_at DESC',
    price_asc: `${priceCol} IS NULL, ${priceCol} ASC`,
    price_desc: `${priceCol} IS NULL, ${priceCol} DESC`,
    area_desc: 'p.area_m2 IS NULL, p.area_m2 DESC',
    reference: 'COALESCE(p.parent_id, p.id), p.parent_id IS NOT NULL, p.reference',
  }[f.sort ?? 'reference'];

  return db.all<PropertyListItem>(`${LIST_SELECT} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT 2000`, params);
}

export function listCities(db: SqlDriver): string[] {
  return db
    .all<{ city: string }>(`SELECT DISTINCT city FROM properties WHERE deleted_at IS NULL AND city IS NOT NULL AND city <> '' ORDER BY city`)
    .map((r) => r.city);
}

interface PropertyRow {
  id: string; reference: string | null; title: string | null; type: PropertyType; status: PropertyStatus;
  purpose: PropertyInput['purpose'] | null; parent_id: string | null; parent_title: string | null;
  price_sale_cents: number | null; price_rent_cents: number | null; area_m2: number | null; land_area_m2: number | null;
  rooms: number | null; bathrooms: number | null; floor: number | null; year_built: number | null;
  address: string | null; city: string | null; district: string | null; latitude: number | null; longitude: number | null;
  title_deed: string | null; description: string | null; attributes_json: string | null; created_at: string; updated_at: string;
}

export function getProperty(db: SqlDriver, id: string): PropertyDetail {
  const p = db.get<PropertyRow>(
    `SELECT p.*, parent.title AS parent_title FROM properties p LEFT JOIN properties parent ON parent.id = p.parent_id
     WHERE p.id = ? AND p.deleted_at IS NULL`,
    [id],
  );
  if (!p) throw new Error('Bien introuvable');
  let attributes: PropertyDetail['attributes'] = {};
  try {
    attributes = p.attributes_json ? (JSON.parse(p.attributes_json) as PropertyDetail['attributes']) : {};
  } catch {
    attributes = {};
  }
  const owners = db.all<PropertyDetail['owners'][number]>(
    `SELECT po.person_id AS personId, COALESCE(pe.full_name_ar, pe.full_name, '') AS name, pe.phone, po.share_bp AS shareBp
     FROM property_owners po JOIN persons pe ON pe.id = po.person_id
     WHERE po.property_id = ? AND po.deleted_at IS NULL AND pe.deleted_at IS NULL
     ORDER BY po.share_bp DESC`,
    [id],
  );
  const activeContract =
    db.get<NonNullable<PropertyDetail['activeContract']>>(
      `SELECT id, reference, type, end_date AS endDate FROM contracts
       WHERE property_id = ? AND deleted_at IS NULL AND status = 'active' ORDER BY start_date DESC LIMIT 1`,
      [id],
    ) ?? null;
  return {
    id: p.id,
    reference: p.reference,
    title: p.title ?? '',
    type: p.type,
    status: p.status,
    purpose: p.purpose ?? 'rent',
    parentId: p.parent_id,
    parentTitle: p.parent_title,
    priceSaleCents: p.price_sale_cents,
    priceRentCents: p.price_rent_cents,
    areaM2: p.area_m2,
    landAreaM2: p.land_area_m2,
    rooms: p.rooms,
    bathrooms: p.bathrooms,
    floor: p.floor,
    yearBuilt: p.year_built,
    address: p.address,
    city: p.city,
    district: p.district,
    latitude: p.latitude,
    longitude: p.longitude,
    titleDeed: p.title_deed,
    description: p.description,
    attributes,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    owners,
    units: listProperties(db, { parentId: id }),
    activeContract,
  };
}

/** Remplace la liste des propriétaires (quotes-parts en points de base, total ≤ 100 %). */
export function setOwners(ctx: StoreContext, propertyId: string, owners: { personId: string; shareBp: number }[]): void {
  const total = owners.reduce((s, o) => s + o.shareBp, 0);
  if (owners.some((o) => !isInt(o.shareBp) || o.shareBp <= 0) || total > 10000) throw new ValidationError({ owners: 'shares' });
  if (new Set(owners.map((o) => o.personId)).size !== owners.length) throw new ValidationError({ owners: 'duplicate' });
  ctx.db.transaction(() => {
    const existing = ctx.db.all<{ id: string; person_id: string; share_bp: number }>(
      'SELECT id, person_id, share_bp FROM property_owners WHERE property_id = ? AND deleted_at IS NULL',
      [propertyId],
    );
    for (const e of existing) {
      const keep = owners.find((o) => o.personId === e.person_id);
      if (!keep) softDelete(ctx, 'property_owners', e.id);
      else if (keep.shareBp !== e.share_bp) update(ctx, 'property_owners', e.id, { share_bp: keep.shareBp });
    }
    for (const o of owners) {
      if (existing.some((e) => e.person_id === o.personId)) continue;
      const person = ctx.db.get('SELECT 1 FROM persons WHERE id = ? AND deleted_at IS NULL', [o.personId]);
      if (!person) throw new ValidationError({ owners: 'unknownPerson' });
      insert(ctx, 'property_owners', { property_id: propertyId, person_id: o.personId, share_bp: o.shareBp });
    }
  });
}

/** Recherche rapide de personnes (sélecteur de propriétaires ; le module M2 l'étendra). */
export function searchPersons(db: SqlDriver, q: string): PersonLookup[] {
  const terms = searchTerms(q);
  const rows = db.all<{ id: string; name: string; phone: string | null; hay: string }>(
    `SELECT id, COALESCE(full_name_ar, full_name, '') AS name, phone,
            COALESCE(full_name, '') || ' ' || COALESCE(full_name_ar, '') || ' ' || COALESCE(phone, '') || ' ' || COALESCE(cin, '') AS hay
     FROM persons WHERE deleted_at IS NULL ORDER BY name LIMIT 500`,
  );
  return rows
    .filter((r) => {
      const hay = normalizeSearch(r.hay);
      return terms.every((t) => hay.includes(t));
    })
    .slice(0, 20)
    .map(({ id, name, phone }) => ({ id, name, phone }));
}

// ───────────── Attributs personnalisés ─────────────

export function listCustomFields(db: SqlDriver, entity: 'properties'): CustomFieldDef[] {
  return db
    .all<{ id: string; key: string; label_ar: string; label_fr: string; label_en: string; field_type: CustomFieldDef['fieldType']; options_json: string | null }>(
      `SELECT id, key, label_ar, label_fr, label_en, field_type, options_json FROM custom_field_defs
       WHERE entity = ? AND deleted_at IS NULL ORDER BY created_at`,
      [entity],
    )
    .map((r) => ({
      id: r.id, entity, key: r.key, labelAr: r.label_ar, labelFr: r.label_fr, labelEn: r.label_en,
      fieldType: r.field_type, options: r.options_json ? (JSON.parse(r.options_json) as string[]) : [],
    }));
}

export function saveCustomField(ctx: StoreContext, def: CustomFieldDef): string {
  const e: Record<string, string> = {};
  if (!/^[a-z][a-z0-9_]{1,40}$/.test(def.key)) e.key = 'invalid';
  if (!def.labelAr.trim() && !def.labelFr.trim()) e.labelAr = 'required';
  if (!['text', 'number', 'boolean', 'date', 'select'].includes(def.fieldType)) e.fieldType = 'invalid';
  if (def.fieldType === 'select' && def.options.filter((o) => o.trim()).length === 0) e.options = 'required';
  const dup = ctx.db.get('SELECT 1 FROM custom_field_defs WHERE entity = ? AND key = ? AND deleted_at IS NULL AND id IS NOT ?', [def.entity, def.key, def.id ?? null]);
  if (dup) e.key = 'duplicate';
  if (Object.keys(e).length) throw new ValidationError(e);
  const row: Row = {
    entity: def.entity,
    key: def.key,
    label_ar: def.labelAr.trim() || def.labelFr.trim(),
    label_fr: def.labelFr.trim() || def.labelAr.trim(),
    label_en: def.labelEn.trim() || def.labelFr.trim() || def.labelAr.trim(),
    field_type: def.fieldType,
    options_json: def.fieldType === 'select' ? JSON.stringify(def.options.map((o) => o.trim()).filter(Boolean)) : null,
  };
  if (def.id) {
    update(ctx, 'custom_field_defs', def.id, row);
    return def.id;
  }
  return insert(ctx, 'custom_field_defs', row);
}

export function removeCustomField(ctx: StoreContext, id: string): void {
  softDelete(ctx, 'custom_field_defs', id);
}

/** Complète `search_text` des biens créés avant la migration 0002. */
export function backfillSearchText(ctx: StoreContext): number {
  const rows = ctx.db.all<Row & { id: string; reference: string | null }>(
    'SELECT id, reference, title, city, district, address, title_deed, description FROM properties WHERE search_text IS NULL',
  );
  for (const r of rows) update(ctx, 'properties', r.id, { search_text: searchTextOf(r, r.reference) });
  return rows.length;
}
