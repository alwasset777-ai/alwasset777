import { describe, expect, it } from 'vitest';
import type { PropertyInput } from '../src/api/contract';
import { insert } from '../src/db/store';
import { attachMedia, kindFromMime, listMedia, mimeFromName, removeMedia, reorderMedia } from '../src/services/media';
import {
  backfillSearchText, createProperty, deleteProperty, getProperty, listCities, listCustomFields, listProperties,
  nextReference, saveCustomField, searchPersons, setOwners, updateProperty, ValidationError,
} from '../src/services/properties';
import { setupAgency } from '../src/services/setup';
import { parseCoordinates } from '../src/text/geo';
import { normalizeSearch, searchTerms } from '../src/text/normalize';
import { context, fakeHash } from './helpers';

const base: PropertyInput = { title: 'شقة جديدة', type: 'apartment', status: 'available', purpose: 'rent', priceRentCents: 500000 };

function seeded() {
  const ctx = context('hub');
  setupAgency(ctx, { agencyName: 'A', city: 'Rabat', adminFullName: 'A', adminUsername: 'admin', adminPassword: 'motdepasse1', language: 'ar', withDemoData: true }, fakeHash, '2026-09-28');
  return ctx;
}

function errorsOf(fn: () => unknown): Record<string, string> {
  try {
    fn();
  } catch (e) {
    if (e instanceof ValidationError) return e.fields;
    throw e;
  }
  return {};
}

describe('normalisation de la recherche', () => {
  it('ignore diacritiques, variantes de lettres arabes, accents et casse', () => {
    expect(normalizeSearch('مَدْرَسَة')).toBe('مدرسه');
    expect(normalizeSearch('أحمد إدريس آمال')).toBe('احمد ادريس امال');
    expect(normalizeSearch('مستشفى')).toBe('مستشفي');
    expect(normalizeSearch('Résidence  ÉTÉ')).toBe('residence ete');
    expect(normalizeSearch('شقة ١٠٢')).toBe('شقه 102');
    expect(searchTerms('  برج   الوسيط ')).toEqual(['برج', 'الوسيط']);
  });
});

describe('coordonnées GPS', () => {
  it('lit les formats Google Maps, Apple Plans et saisie libre', () => {
    expect(parseCoordinates('33.5831, -7.6326')).toEqual({ lat: 33.5831, lng: -7.6326 });
    expect(parseCoordinates('https://www.google.com/maps/place/Casablanca/@33.5722678,-7.6570322,12z/data=x')).toEqual({ lat: 33.572268, lng: -7.657032 });
    expect(parseCoordinates('https://www.google.com/maps/place/X/@33.1,-7.1,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d33.5831!4d-7.6326')).toEqual({ lat: 33.5831, lng: -7.6326 });
    expect(parseCoordinates('https://maps.google.com/?q=31.6295,-7.9811')).toEqual({ lat: 31.6295, lng: -7.9811 });
    expect(parseCoordinates('https://maps.apple.com/?ll=35.7595,-5.8340&q=Tanger')).toEqual({ lat: 35.7595, lng: -5.834 });
    expect(parseCoordinates('geo:34.02,-6.83')).toEqual({ lat: 34.02, lng: -6.83 });
    expect(parseCoordinates('https://maps.app.goo.gl/abc')).toBeNull();
    expect(parseCoordinates('95, 10')).toBeNull();
  });
});

describe('biens — création, validation, références', () => {
  it('génère une référence par type et crée le bien', () => {
    const ctx = seeded();
    expect(nextReference(ctx.db, 'apartment')).toBe('WS-A202');
    expect(nextReference(ctx.db, 'villa')).toBe('WS-V02');
    const id = createProperty(ctx, { ...base, city: 'الرباط', district: 'أكدال' });
    const p = getProperty(ctx.db, id);
    expect(p.reference).toBe('WS-A202');
    expect(p.title).toBe('شقة جديدة');
    expect(listCities(ctx.db)).toContain('الرباط');
  });

  it('refuse les saisies invalides avec des codes par champ', () => {
    const ctx = seeded();
    expect(errorsOf(() => createProperty(ctx, { ...base, title: ' ' }))).toMatchObject({ title: 'required' });
    expect(errorsOf(() => createProperty(ctx, { ...base, priceRentCents: null }))).toMatchObject({ priceRentCents: 'required' });
    expect(errorsOf(() => createProperty(ctx, { ...base, purpose: 'sale', priceSaleCents: -5 }))).toMatchObject({ priceSaleCents: 'invalid' });
    expect(errorsOf(() => createProperty(ctx, { ...base, rooms: 2.5, yearBuilt: 1700 }))).toMatchObject({ rooms: 'invalid', yearBuilt: 'invalid' });
    expect(errorsOf(() => createProperty(ctx, { ...base, latitude: 33 }))).toMatchObject({ latitude: 'invalid' });
    expect(errorsOf(() => createProperty(ctx, { ...base, reference: 'WS-A101' }))).toMatchObject({ reference: 'duplicate' });
  });

  it('un lot doit appartenir à une tour ou un immeuble', () => {
    const ctx = seeded();
    const villa = listProperties(ctx.db, { type: 'villa' })[0]!.id;
    const tower = listProperties(ctx.db, { type: 'tower' })[0]!.id;
    expect(errorsOf(() => createProperty(ctx, { ...base, parentId: villa }))).toMatchObject({ parentId: 'invalid' });
    const unit = createProperty(ctx, { ...base, parentId: tower, floor: 3 });
    expect(getProperty(ctx.db, tower).units.map((u) => u.id)).toContain(unit);
    expect(errorsOf(() => createProperty(ctx, { title: 'برج 2', type: 'tower', status: 'available', purpose: 'both', parentId: tower }))).toMatchObject({ parentId: 'invalid' });
  });

  it('modification : seuls les champs changés sont journalisés', () => {
    const ctx = seeded();
    const id = createProperty(ctx, base);
    const before = ctx.db.get<{ n: number }>('SELECT COUNT(*) AS n FROM change_log')!.n;
    updateProperty(ctx, id, { ...base, priceRentCents: 550000 });
    const logged = ctx.db.all<{ col: string }>('SELECT col FROM change_log ORDER BY seq DESC LIMIT 10').map((r) => r.col);
    const after = ctx.db.get<{ n: number }>('SELECT COUNT(*) AS n FROM change_log')!.n;
    expect(logged).toContain('price_rent_cents');
    expect(logged).not.toContain('title');
    expect(after - before).toBe(2); // price_rent_cents + updated_at
  });

  it('suppression refusée si lots ou contrat actif', () => {
    const ctx = seeded();
    const tower = listProperties(ctx.db, { type: 'tower' })[0]!.id;
    expect(errorsOf(() => deleteProperty(ctx, tower))).toMatchObject({ delete: 'hasUnits' });
    const rented = listProperties(ctx.db, { status: 'rented' })[0]!.id;
    expect(errorsOf(() => deleteProperty(ctx, rented))).toMatchObject({ delete: 'hasContract' });
    const free = createProperty(ctx, base);
    deleteProperty(ctx, free);
    expect(() => getProperty(ctx.db, free)).toThrow();
  });
});

describe('recherche avancée', () => {
  it('texte insensible aux variantes arabes + filtres combinés', () => {
    const ctx = seeded();
    expect(listProperties(ctx.db, { q: 'شقه' }).length).toBe(3); // « شقة » écrit avec ه
    expect(listProperties(ctx.db, { q: 'برج المعاريف' }).length).toBeGreaterThanOrEqual(1);
    expect(listProperties(ctx.db, { q: 'ws-v01' }).map((p) => p.reference)).toEqual(['WS-V01']);
    expect(listProperties(ctx.db, { purpose: 'rent', priceMaxCents: 1000000 }).map((p) => p.reference).sort()).toEqual(['WS-A101', 'WS-A102', 'WS-M01']);
    expect(listProperties(ctx.db, { purpose: 'sale', priceMinCents: 400000000 }).map((p) => p.reference).sort()).toEqual(['WS-S01', 'WS-V01']);
    expect(listProperties(ctx.db, { areaMin: 100, areaMax: 150 }).map((p) => p.reference).sort()).toEqual(['WS-A102', 'WS-A201', 'WS-B01']);
    expect(listProperties(ctx.db, { roomsMin: 4 }).map((p) => p.reference).sort()).toEqual(['WS-A201', 'WS-V01']);
    expect(listProperties(ctx.db, { topLevelOnly: true }).some((p) => p.parentId)).toBe(false);
    const tower = listProperties(ctx.db, { type: 'tower' })[0]!;
    expect(tower.unitsCount).toBe(3);
  });

  it('tri par prix', () => {
    const ctx = seeded();
    const prices = listProperties(ctx.db, { purpose: 'rent', sort: 'price_desc' }).map((p) => p.priceRentCents);
    expect(prices).toEqual([...prices].sort((a, b) => (b ?? 0) - (a ?? 0)));
  });

  it('backfill du texte de recherche pour les anciennes bases', () => {
    const ctx = seeded();
    insert(ctx, 'properties', { title: 'Ancien bien', city: 'Fès', reference: 'OLD-1' });
    expect(listProperties(ctx.db, { q: 'fes' })).toHaveLength(0);
    expect(backfillSearchText(ctx)).toBe(1);
    expect(listProperties(ctx.db, { q: 'fes' })).toHaveLength(1);
  });
});

describe('propriétaires', () => {
  it('ajoute, modifie et retire des propriétaires avec quotes-parts', () => {
    const ctx = seeded();
    const id = createProperty(ctx, base);
    const [a, b] = searchPersons(ctx.db, '');
    setOwners(ctx, id, [{ personId: a!.id, shareBp: 6000 }, { personId: b!.id, shareBp: 4000 }]);
    expect(getProperty(ctx.db, id).owners.map((o) => o.shareBp)).toEqual([6000, 4000]);
    setOwners(ctx, id, [{ personId: b!.id, shareBp: 10000 }]);
    expect(getProperty(ctx.db, id).owners).toEqual([expect.objectContaining({ personId: b!.id, shareBp: 10000 })]);
    expect(errorsOf(() => setOwners(ctx, id, [{ personId: a!.id, shareBp: 7000 }, { personId: b!.id, shareBp: 4000 }]))).toMatchObject({ owners: 'shares' });
  });
  it('recherche de personnes (arabe, latin, téléphone)', () => {
    const ctx = seeded();
    expect(searchPersons(ctx.db, 'بناني')[0]?.name).toBe('محمد بناني');
    expect(searchPersons(ctx.db, 'bennani')[0]?.name).toBe('محمد بناني');
    expect(searchPersons(ctx.db, '000002')[0]?.name).toBe('خديجة التازي');
  });
});

describe('attributs personnalisés', () => {
  it('définit des champs et valide les valeurs', () => {
    const ctx = seeded();
    saveCustomField(ctx, { entity: 'properties', key: 'piscine', labelAr: 'مسبح', labelFr: 'Piscine', labelEn: '', fieldType: 'boolean', options: [] });
    saveCustomField(ctx, { entity: 'properties', key: 'orientation', labelAr: 'الواجهة', labelFr: 'Orientation', labelEn: '', fieldType: 'select', options: ['شمال', 'جنوب'] });
    expect(listCustomFields(ctx.db, 'properties').map((d) => d.key)).toEqual(['piscine', 'orientation']);
    expect(errorsOf(() => saveCustomField(ctx, { entity: 'properties', key: 'piscine', labelAr: 'x', labelFr: '', labelEn: '', fieldType: 'text', options: [] }))).toMatchObject({ key: 'duplicate' });
    const id = createProperty(ctx, { ...base, attributes: { piscine: true, orientation: 'جنوب' } });
    expect(getProperty(ctx.db, id).attributes).toEqual({ piscine: true, orientation: 'جنوب' });
    expect(errorsOf(() => createProperty(ctx, { ...base, attributes: { orientation: 'شرق' } }))).toMatchObject({ 'attr.orientation': 'invalid' });
    expect(errorsOf(() => createProperty(ctx, { ...base, attributes: { inconnu: 1 } }))).toMatchObject({ 'attr.inconnu': 'unknown' });
  });
});

describe('médias', () => {
  const file = (n: number, name = `photo${n}.jpg`) => ({
    sha256: String(n).repeat(64).slice(0, 64), sizeBytes: 1000 + n, mime: mimeFromName(name), originalName: name, thumbSha256: null,
  });
  it('rattache, déduplique, réordonne et supprime', () => {
    const ctx = seeded();
    const id = createProperty(ctx, base);
    const m1 = attachMedia(ctx, 'properties', id, file(1));
    const m2 = attachMedia(ctx, 'properties', id, file(2));
    attachMedia(ctx, 'properties', id, file(3, 'contrat.pdf'));
    expect(attachMedia(ctx, 'properties', id, file(1))).toBe(m1);
    expect(listMedia(ctx.db, 'properties', id).map((m) => m.kind)).toEqual(['photo', 'photo', 'document']);
    expect(listProperties(ctx.db, { q: 'شقة جديدة' })[0]!.coverSha).toBe(file(1).sha256);
    reorderMedia(ctx, 'properties', id, [m2, m1]);
    expect(listProperties(ctx.db, { q: 'شقة جديدة' })[0]!.coverSha).toBe(file(2).sha256);
    removeMedia(ctx, m2);
    expect(listMedia(ctx.db, 'properties', id)).toHaveLength(2);
  });
  it('types MIME', () => {
    expect(kindFromMime(mimeFromName('a.MOV'))).toBe('video');
    expect(kindFromMime(mimeFromName('a.heic'))).toBe('photo');
    expect(kindFromMime(mimeFromName('titre.pdf'))).toBe('document');
  });
});
