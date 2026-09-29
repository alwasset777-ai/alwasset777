import { useState } from 'react';
import { PROPERTY_STATUSES, type CustomFieldDef, type PersonLookup, type PropertyDetail as Detail, type PropertyStatus } from '../../../api/contract';
import { formatMoney } from '../../../finance/money';
import type { DictKey } from '../../../i18n/index';
import { mapsUrl } from '../../../text/geo';
import { errorMessage, useApi, useAsync, validationFields } from '../../api';
import { Alert, Badge, Button, Card, Input, PageTitle, Select, Spinner } from '../../components/ui';
import { useI18n } from '../../i18n';
import { MediaGallery } from './MediaGallery';
import { PriceTag } from './PropertyList';

export function PropertyDetail({ id, canWrite, onBack, onEdit, onOpen, onAddUnit }: {
  id: string; canWrite: boolean; onBack(): void; onEdit(): void; onOpen(id: string): void; onAddUnit(): void;
}) {
  const api = useApi();
  const { t, lang } = useI18n();
  const { data: p, error, reload } = useAsync(() => api.properties.get(id), [id]);
  const defs = useAsync(() => api.customFields.list('properties'), []);
  const [actionError, setActionError] = useState<string>();

  if (error) return <Alert>{error}</Alert>;
  if (!p) return <Spinner />;
  const isContainer = p.type === 'tower' || p.type === 'building';

  async function act(fn: () => Promise<unknown>) {
    setActionError(undefined);
    try {
      await fn();
      reload();
    } catch (e) {
      const f = validationFields(e);
      const code = f && Object.values(f)[0];
      setActionError(code ? t(`err.${code}` as DictKey) : errorMessage(e));
    }
  }

  async function remove() {
    if (!confirm(t('prop.confirmDelete'))) return;
    setActionError(undefined);
    try {
      await api.properties.remove(id);
      onBack();
    } catch (e) {
      const f = validationFields(e);
      setActionError(f?.delete ? t(`err.${f.delete}` as DictKey) : errorMessage(e));
    }
  }

  const info: [string, string | number | null | undefined][] = [
    [t('field.type'), t(`type.${p.type}` as DictKey)],
    [t('field.purpose'), t(`purpose.${p.purpose}` as DictKey)],
    [t('field.area'), p.areaM2 != null ? `${p.areaM2} m²` : null],
    [t('field.landArea'), p.landAreaM2 != null ? `${p.landAreaM2} m²` : null],
    [t('field.rooms'), p.rooms],
    [t('field.bathrooms'), p.bathrooms],
    [t('field.floor'), p.floor],
    [t('field.yearBuilt'), p.yearBuilt],
    [t('field.titleDeed'), p.titleDeed],
    [t('field.priceRent'), p.priceRentCents != null ? formatMoney(p.priceRentCents, 'MAD', lang) : null],
    [t('field.priceSale'), p.priceSaleCents != null ? formatMoney(p.priceSaleCents, 'MAD', lang) : null],
  ];
  const customLabel = (d: CustomFieldDef) => (lang === 'ar' ? d.labelAr : lang === 'fr' ? d.labelFr : d.labelEn);
  const custom = (defs.data ?? [])
    .filter((d) => p.attributes?.[d.key] != null)
    .map((d) => {
      const v = p.attributes![d.key];
      return [customLabel(d), typeof v === 'boolean' ? t(v ? 'common.yes' : 'common.no') : String(v)] as const;
    });

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-muted hover:text-ink">{lang === 'ar' ? '→' : '←'} {t('common.back')}</button>
      <PageTitle
        actions={
          canWrite && (
            <div className="flex flex-wrap gap-2">
              <Select
                aria-label={t('detail.changeStatus')}
                className="w-auto"
                value={p.status}
                onChange={(e) => void act(() => api.properties.setStatus(id, e.target.value as PropertyStatus))}
              >
                {PROPERTY_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}` as DictKey)}</option>)}
              </Select>
              {isContainer && <Button variant="secondary" onClick={onAddUnit}>+ {t('prop.addUnit')}</Button>}
              <Button onClick={onEdit}>{t('common.edit')}</Button>
              <Button variant="danger" onClick={() => void remove()}>{t('common.delete')}</Button>
            </div>
          )
        }
      >
        <span className="flex flex-wrap items-center gap-3">
          {p.title}
          <Badge tone={p.status}>{t(`status.${p.status}` as DictKey)}</Badge>
        </span>
      </PageTitle>
      <div className="-mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        <span className="num">{p.reference}</span>
        {p.parentId && <button className="text-brand-600 hover:underline" onClick={() => onOpen(p.parentId!)}>{p.parentTitle}</button>}
        <span>{[p.district, p.city].filter(Boolean).join('، ')}</span>
        <PriceTag p={p} className="text-base" />
      </div>
      {actionError && <Alert>{actionError}</Alert>}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <MediaGallery entity="properties" entityId={id} canWrite={canWrite} />
          {p.description && (
            <Card title={t('form.description')}><p className="whitespace-pre-line text-sm leading-7">{p.description}</p></Card>
          )}
          {isContainer && (
            <Card title={`${t('detail.units')} (${p.units.length})`} actions={canWrite && <Button variant="secondary" onClick={onAddUnit}>+ {t('prop.addUnit')}</Button>}>
              {p.units.length === 0 ? <p className="text-sm text-muted">{t('common.none')}</p> : (
                <ul className="divide-y divide-line">
                  {p.units.map((u) => (
                    <li key={u.id}>
                      <button className="flex w-full items-center justify-between gap-3 py-2 text-start hover:bg-canvas" onClick={() => onOpen(u.id)}>
                        <span><span className="num text-muted">{u.reference}</span> · {u.title}</span>
                        <span className="flex items-center gap-3"><PriceTag p={u} className="text-sm" /><Badge tone={u.status}>{t(`status.${u.status}` as DictKey)}</Badge></span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card title={t('detail.info')}>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              {[...info, ...custom].filter(([, v]) => v != null && v !== '').map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-semibold"><span className={typeof v === 'number' || /^[\d\s.,]+/.test(String(v)) ? 'num' : ''}>{v}</span></dd>
                </div>
              ))}
            </dl>
            {p.activeContract && (
              <div className="mt-4 rounded-lg bg-canvas p-3 text-sm">
                <div className="text-muted">{t('detail.contract')}</div>
                <div className="num font-semibold">{p.activeContract.reference} {p.activeContract.endDate && `→ ${p.activeContract.endDate}`}</div>
              </div>
            )}
            <div className="mt-4 text-xs text-muted">{t('detail.updatedAt')}: <span className="num">{new Date(p.updatedAt).toLocaleString()}</span></div>
          </Card>

          <Card title={t('form.location')}>
            {p.address && <p className="mb-2 text-sm">{p.address}</p>}
            {p.latitude != null && p.longitude != null ? (
              <a className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline" href={mapsUrl({ lat: p.latitude, lng: p.longitude })} target="_blank" rel="noreferrer">
                📍 {t('detail.openMap')} <span className="num text-xs text-muted">{p.latitude}, {p.longitude}</span>
              </a>
            ) : <p className="text-sm text-muted">{t('detail.noLocation')}</p>}
          </Card>

          <OwnersCard p={p} canWrite={canWrite} onSaved={reload} />
        </div>
      </div>
    </div>
  );
}

function OwnersCard({ p, canWrite, onSaved }: { p: Detail; canWrite: boolean; onSaved(): void }) {
  const api = useApi();
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<{ personId: string; name: string; share: string }[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string>();
  const results = useAsync<PersonLookup[]>(() => (editing && q.trim() ? api.persons.search(q) : Promise.resolve([])), [editing, q]);

  function start() {
    setRows(p.owners.map((o) => ({ personId: o.personId, name: o.name, share: String(o.shareBp / 100) })));
    setEditing(true);
    setError(undefined);
  }

  async function save() {
    const owners = rows.map((r) => ({ personId: r.personId, shareBp: Math.round(Number(r.share.replace(',', '.')) * 100) }));
    if (owners.some((o) => !Number.isFinite(o.shareBp) || o.shareBp <= 0)) return setError(t('err.shares'));
    try {
      await api.properties.setOwners(p.id, owners);
      setEditing(false);
      onSaved();
    } catch (e) {
      const f = validationFields(e);
      setError(f?.owners ? t(f.owners === 'shares' ? 'err.shares' : 'err.invalid') : errorMessage(e));
    }
  }

  return (
    <Card title={t('detail.owners')} actions={canWrite && !editing && <Button variant="ghost" onClick={start}>{t('common.edit')}</Button>}>
      {!editing ? (
        p.owners.length === 0 ? <p className="text-sm text-muted">{t('common.none')}</p> : (
          <ul className="space-y-2 text-sm">
            {p.owners.map((o) => (
              <li key={o.personId} className="flex justify-between gap-2">
                <span>{o.name} {o.phone && <span dir="ltr" className="num text-xs text-muted">{o.phone}</span>}</span>
                <span className="num font-semibold">{o.shareBp / 100} %</span>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={r.personId} className="flex items-center gap-2 text-sm">
              <span className="flex-1 truncate">{r.name}</span>
              <Input className="w-20" dir="ltr" inputMode="decimal" aria-label={t('detail.share')} value={r.share}
                onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, share: e.target.value } : x)))} />
              <span>%</span>
              <button className="text-muted hover:text-brand-600" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={t('common.delete')}>✕</button>
            </div>
          ))}
          <div className="relative">
            <Input placeholder={t('detail.searchPerson')} value={q} onChange={(e) => setQ(e.target.value)} />
            {results.data && results.data.length > 0 && (
              <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-lg border border-line bg-white shadow">
                {results.data.filter((r) => !rows.some((x) => x.personId === r.id)).map((r) => (
                  <li key={r.id}>
                    <button className="w-full px-3 py-2 text-start text-sm hover:bg-canvas" onClick={() => {
                      const used = rows.reduce((s, x) => s + (Number(x.share) || 0), 0);
                      setRows([...rows, { personId: r.id, name: r.name, share: String(Math.max(0, 100 - used)) }]);
                      setQ('');
                    }}>
                      {r.name} {r.phone && <span dir="ltr" className="num text-xs text-muted">{r.phone}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error && <Alert>{error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => void save()}>{t('common.save')}</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
