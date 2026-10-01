import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  CONTAINER_TYPES, PROPERTY_PURPOSES, PROPERTY_STATUSES, PROPERTY_TYPES,
  type CustomFieldDef, type PropertyDetail, type PropertyInput, type PropertyPurpose, type PropertyStatus, type PropertyType,
} from '../../../api/contract';
import { parseMoney } from '../../../finance/money';
import type { DictKey } from '../../../i18n/index';
import { mapsUrl, parseCoordinates } from '../../../text/geo';
import { errorMessage, useApi, useAsync, validationFields } from '../../api';
import { Alert, Button, Card, Field, Input, PageTitle, Select, Spinner, Textarea } from '../../components/ui';
import { useI18n } from '../../i18n';

/** Valeurs du formulaire (texte brut, converties à l'envoi). */
interface FormState {
  reference: string; title: string; type: PropertyType; status: PropertyStatus; purpose: PropertyPurpose; parentId: string;
  priceSale: string; priceRent: string; area: string; landArea: string; rooms: string; bathrooms: string; floor: string; yearBuilt: string;
  address: string; city: string; district: string; coords: string; titleDeed: string; description: string;
  attributes: Record<string, string | boolean>;
}

const centsToText = (c: number | null | undefined) => (c == null ? '' : String(c / 100));
const numToText = (n: number | null | undefined) => (n == null ? '' : String(n));

function fromDetail(p: PropertyDetail): FormState {
  return {
    reference: p.reference ?? '', title: p.title, type: p.type, status: p.status, purpose: p.purpose, parentId: p.parentId ?? '',
    priceSale: centsToText(p.priceSaleCents), priceRent: centsToText(p.priceRentCents), area: numToText(p.areaM2), landArea: numToText(p.landAreaM2),
    rooms: numToText(p.rooms), bathrooms: numToText(p.bathrooms), floor: numToText(p.floor), yearBuilt: numToText(p.yearBuilt),
    address: p.address ?? '', city: p.city ?? '', district: p.district ?? '',
    coords: p.latitude != null && p.longitude != null ? `${p.latitude}, ${p.longitude}` : '',
    titleDeed: p.titleDeed ?? '', description: p.description ?? '',
    attributes: Object.fromEntries(Object.entries(p.attributes ?? {}).map(([k, v]) => [k, typeof v === 'boolean' ? v : v == null ? '' : String(v)])),
  };
}

function blank(parentId?: string, parent?: PropertyDetail): FormState {
  return {
    reference: '', title: '', type: 'apartment', status: 'available', purpose: 'rent', parentId: parentId ?? '',
    priceSale: '', priceRent: '', area: '', landArea: '', rooms: '', bathrooms: '', floor: '', yearBuilt: '',
    address: parent?.address ?? '', city: parent?.city ?? '', district: parent?.district ?? '',
    coords: parent?.latitude != null && parent.longitude != null ? `${parent.latitude}, ${parent.longitude}` : '',
    titleDeed: '', description: '', attributes: {},
  };
}

/** Convertit la saisie ; les erreurs de format sont renvoyées par champ. */
function toInput(f: FormState, defs: CustomFieldDef[]): { input: PropertyInput; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const money = (k: 'priceSale' | 'priceRent', field: string) => {
    if (!f[k].trim()) return null;
    try {
      return parseMoney(f[k]);
    } catch {
      errors[field] = 'invalid';
      return null;
    }
  };
  const num = (k: keyof FormState, field: string, int = false) => {
    const s = String(f[k]).trim().replace(',', '.');
    if (!s) return null;
    const n = Number(s);
    if (!Number.isFinite(n) || (int && !Number.isInteger(n))) {
      errors[field] = 'invalid';
      return null;
    }
    return n;
  };
  const coords = f.coords.trim() ? parseCoordinates(f.coords) : null;
  if (f.coords.trim() && !coords) errors.latitude = 'invalid';
  const attributes: PropertyInput['attributes'] = {};
  for (const d of defs) {
    const v = f.attributes[d.key];
    if (v === undefined || v === '') continue;
    if (d.fieldType === 'number') {
      const n = Number(String(v).replace(',', '.'));
      if (Number.isFinite(n)) attributes[d.key] = n;
      else errors[`attr.${d.key}`] = 'invalid';
    } else if (d.fieldType === 'boolean') attributes[d.key] = v === true;
    else attributes[d.key] = String(v);
  }
  return {
    errors,
    input: {
      reference: f.reference.trim() || null, title: f.title, type: f.type, status: f.status, purpose: f.purpose, parentId: f.parentId || null,
      priceSaleCents: money('priceSale', 'priceSaleCents'), priceRentCents: money('priceRent', 'priceRentCents'),
      areaM2: num('area', 'areaM2'), landAreaM2: num('landArea', 'landAreaM2'), rooms: num('rooms', 'rooms', true),
      bathrooms: num('bathrooms', 'bathrooms', true), floor: num('floor', 'floor', true), yearBuilt: num('yearBuilt', 'yearBuilt', true),
      address: f.address, city: f.city, district: f.district, latitude: coords?.lat ?? null, longitude: coords?.lng ?? null,
      titleDeed: f.titleDeed, description: f.description, attributes,
    },
  };
}

// Défini hors du composant : sinon chaque frappe recréerait les champs (perte du focus).
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card title={title}><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div></Card>
  );
}

export function PropertyForm({ id, parentId, onSaved, onCancel }: { id?: string; parentId?: string; onSaved(id: string): void; onCancel(): void }) {
  const api = useApi();
  const { t, lang } = useI18n();
  const existing = useAsync(() => (id ? api.properties.get(id) : Promise.resolve(null)), [id]);
  const parent = useAsync(() => (parentId ? api.properties.get(parentId) : Promise.resolve(null)), [parentId]);
  const containers = useAsync(() => api.properties.list({ topLevelOnly: true }), []);
  const defs = useAsync(() => api.customFields.list('properties'), []);
  const cities = useAsync(() => api.properties.cities(), []);
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const initialized = useRef(false);

  // Initialise une seule fois : une synchro en arrière-plan n'écrase pas la saisie en cours.
  useEffect(() => {
    if (initialized.current) return;
    if (id && existing.data) setForm(fromDetail(existing.data));
    else if (!id && (!parentId || parent.data)) setForm(blank(parentId, parent.data ?? undefined));
    else return;
    initialized.current = true;
  }, [id, parentId, existing.data, parent.data]);

  if (existing.error) return <Alert>{existing.error}</Alert>;
  if (!form) return <Spinner />;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const err = (k: string) => (errors[k] ? t(`err.${errors[k]}` as DictKey) : undefined);
  const isContainer = CONTAINER_TYPES.includes(form.type);
  const coords = form.coords.trim() ? parseCoordinates(form.coords) : null;
  const label = (d: CustomFieldDef) => (lang === 'ar' ? d.labelAr : lang === 'fr' ? d.labelFr : d.labelEn);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    const { input, errors: local } = toInput(form, defs.data ?? []);
    setErrors(local);
    setError(undefined);
    if (Object.keys(local).length) return setError(t('err.form'));
    setBusy(true);
    try {
      if (id) {
        await api.properties.update(id, input);
        onSaved(id);
      } else onSaved(await api.properties.create(input));
    } catch (ex) {
      const fields = validationFields(ex);
      if (fields) {
        setErrors(fields);
        setError(t('err.form'));
      } else setError(errorMessage(ex));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <PageTitle
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onCancel}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={busy}>{t('common.save')}</Button>
          </div>
        }
      >
        {id ? t('prop.editTitle') : parentId ? `${t('prop.addUnit')} — ${parent.data?.title ?? ''}` : t('prop.newTitle')}
      </PageTitle>
      {error && <Alert>{error}</Alert>}

      <Section title={t('form.general')}>
        <Field className="sm:col-span-2" label={t('field.title')} error={err('title')}>
          <Input required value={form.title} onChange={(e) => set('title', e.target.value)} autoFocus />
        </Field>
        <Field label={t('field.reference')} error={err('reference')}>
          <Input dir="ltr" placeholder={t('field.referenceAuto')} value={form.reference} onChange={(e) => set('reference', e.target.value)} />
        </Field>
        <Field label={t('field.type')} error={err('type')}>
          <Select value={form.type} onChange={(e) => set('type', e.target.value as PropertyType)}>
            {PROPERTY_TYPES.map((x) => <option key={x} value={x}>{t(`type.${x}` as DictKey)}</option>)}
          </Select>
        </Field>
        <Field label={t('field.status')} error={err('status')}>
          <Select value={form.status} onChange={(e) => set('status', e.target.value as PropertyStatus)}>
            {PROPERTY_STATUSES.map((x) => <option key={x} value={x}>{t(`status.${x}` as DictKey)}</option>)}
          </Select>
        </Field>
        <Field label={t('field.purpose')} error={err('purpose')}>
          <Select value={form.purpose} onChange={(e) => set('purpose', e.target.value as PropertyPurpose)}>
            {PROPERTY_PURPOSES.map((x) => <option key={x} value={x}>{t(`purpose.${x}` as DictKey)}</option>)}
          </Select>
        </Field>
        {!isContainer && (
          <Field className="sm:col-span-2" label={t('field.parent')} error={err('parentId')}>
            <Select value={form.parentId} onChange={(e) => set('parentId', e.target.value)}>
              <option value="">{t('field.none')}</option>
              {containers.data?.filter((c) => c.type === 'tower' || c.type === 'building').filter((c) => c.id !== id).map((c) => (
                <option key={c.id} value={c.id}>{c.reference} — {c.title}</option>
              ))}
            </Select>
          </Field>
        )}
      </Section>

      <Section title={t('form.prices')}>
        {form.purpose !== 'sale' && (
          <Field label={t('field.priceRent')} error={err('priceRentCents')}>
            <Input inputMode="decimal" dir="ltr" value={form.priceRent} onChange={(e) => set('priceRent', e.target.value)} />
          </Field>
        )}
        {form.purpose !== 'rent' && (
          <Field label={t('field.priceSale')} error={err('priceSaleCents')}>
            <Input inputMode="decimal" dir="ltr" value={form.priceSale} onChange={(e) => set('priceSale', e.target.value)} />
          </Field>
        )}
      </Section>

      <Section title={t('form.features')}>
        <Field label={t('field.area')} error={err('areaM2')}><Input inputMode="decimal" dir="ltr" value={form.area} onChange={(e) => set('area', e.target.value)} /></Field>
        <Field label={t('field.landArea')} error={err('landAreaM2')}><Input inputMode="decimal" dir="ltr" value={form.landArea} onChange={(e) => set('landArea', e.target.value)} /></Field>
        <Field label={t('field.rooms')} error={err('rooms')}><Input inputMode="numeric" dir="ltr" value={form.rooms} onChange={(e) => set('rooms', e.target.value)} /></Field>
        <Field label={t('field.bathrooms')} error={err('bathrooms')}><Input inputMode="numeric" dir="ltr" value={form.bathrooms} onChange={(e) => set('bathrooms', e.target.value)} /></Field>
        <Field label={t('field.floor')} error={err('floor')}><Input inputMode="numeric" dir="ltr" value={form.floor} onChange={(e) => set('floor', e.target.value)} /></Field>
        <Field label={t('field.yearBuilt')} error={err('yearBuilt')}><Input inputMode="numeric" dir="ltr" value={form.yearBuilt} onChange={(e) => set('yearBuilt', e.target.value)} /></Field>
        <Field label={t('field.titleDeed')}><Input dir="ltr" value={form.titleDeed} onChange={(e) => set('titleDeed', e.target.value)} /></Field>
      </Section>

      <Section title={t('form.location')}>
        <Field label={t('field.city')}>
          <Input list="alw-cities" value={form.city} onChange={(e) => set('city', e.target.value)} />
          <datalist id="alw-cities">{cities.data?.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label={t('field.district')}><Input value={form.district} onChange={(e) => set('district', e.target.value)} /></Field>
        <Field className="sm:col-span-2" label={t('field.address')}><Input value={form.address} onChange={(e) => set('address', e.target.value)} /></Field>
        <Field
          className="sm:col-span-2 lg:col-span-4"
          label={t('field.coords')}
          error={err('latitude')}
          hint={
            !form.coords.trim() ? t('field.coordsHelp') : coords ? (
              <a className="text-brand-600 underline" href={mapsUrl(coords)} target="_blank" rel="noreferrer">
                📍 {t('form.location')}: <span className="num">{coords.lat}, {coords.lng}</span> ↗
              </a>
            ) : t('field.coordsNotFound')
          }
        >
          <Input dir="ltr" value={form.coords} onChange={(e) => set('coords', e.target.value)} placeholder="https://maps.google.com/…" />
        </Field>
      </Section>

      <Card title={t('form.description')}>
        <Textarea aria-label={t('field.description')} value={form.description} onChange={(e) => set('description', e.target.value)} rows={5} />
      </Card>

      {defs.data && defs.data.length > 0 && (
        <Section title={t('form.custom')}>
          {defs.data.map((d) => {
            const v = form.attributes[d.key];
            const setAttr = (val: string | boolean) => set('attributes', { ...form.attributes, [d.key]: val });
            return (
              <Field key={d.key} label={label(d)} error={err(`attr.${d.key}`)}>
                {d.fieldType === 'boolean' ? (
                  <Select value={v === true ? '1' : v === false ? '0' : ''} onChange={(e) => setAttr(e.target.value === '' ? '' : e.target.value === '1')}>
                    <option value="">—</option>
                    <option value="1">{t('common.yes')}</option>
                    <option value="0">{t('common.no')}</option>
                  </Select>
                ) : d.fieldType === 'select' ? (
                  <Select value={String(v ?? '')} onChange={(e) => setAttr(e.target.value)}>
                    <option value="">—</option>
                    {d.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </Select>
                ) : (
                  <Input
                    type={d.fieldType === 'date' ? 'date' : 'text'}
                    inputMode={d.fieldType === 'number' ? 'decimal' : undefined}
                    value={String(v ?? '')}
                    onChange={(e) => setAttr(e.target.value)}
                  />
                )}
              </Field>
            );
          })}
        </Section>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>{t('common.cancel')}</Button>
        <Button type="submit" disabled={busy}>{t('common.save')}</Button>
      </div>
    </form>
  );
}
