import { useEffect, useState } from 'react';
import { PROPERTY_STATUSES, PROPERTY_TYPES, type PropertyFilters, type PropertyListItem } from '../../../api/contract';
import { formatMoney, parseMoney } from '../../../finance/money';
import type { DictKey } from '../../../i18n/index';
import { useApi, useAsync } from '../../api';
import { MediaImage } from '../../components/Media';
import { Alert, Badge, Button, Card, cx, Field, Input, PageTitle, Select, Spinner } from '../../components/ui';
import { useI18n } from '../../i18n';

const VIEW_KEY = 'alwasset.propertiesView';

interface FilterForm {
  q: string; type: string; status: string; city: string; purpose: '' | 'rent' | 'sale';
  priceMin: string; priceMax: string; areaMin: string; areaMax: string; roomsMin: string;
  topLevelOnly: boolean; sort: NonNullable<PropertyFilters['sort']>;
}
const EMPTY: FilterForm = {
  q: '', type: '', status: '', city: '', purpose: '', priceMin: '', priceMax: '', areaMin: '', areaMax: '', roomsMin: '',
  topLevelOnly: false, sort: 'reference',
};

function toFilters(f: FilterForm): PropertyFilters {
  const num = (s: string) => (s.trim() && Number.isFinite(Number(s)) ? Number(s) : undefined);
  const money = (s: string) => {
    try {
      return s.trim() ? parseMoney(s) : undefined;
    } catch {
      return undefined;
    }
  };
  return {
    q: f.q || undefined, type: f.type || undefined, status: f.status || undefined, city: f.city || undefined,
    purpose: f.purpose || undefined, priceMinCents: money(f.priceMin), priceMaxCents: money(f.priceMax),
    areaMin: num(f.areaMin), areaMax: num(f.areaMax), roomsMin: num(f.roomsMin), topLevelOnly: f.topLevelOnly || undefined, sort: f.sort,
  };
}

export function PropertyList({ canWrite, onOpen, onCreate }: { canWrite: boolean; onOpen(id: string): void; onCreate(): void }) {
  const api = useApi();
  const { t } = useI18n();
  const [form, setForm] = useState<FilterForm>(EMPTY);
  const [debounced, setDebounced] = useState(form);
  const [advanced, setAdvanced] = useState(false);
  const [view, setView] = useState<'grid' | 'table'>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'grid';
    } catch {
      return 'grid';
    }
  });
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(form), 250);
    return () => clearTimeout(timer);
  }, [form]);
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      /* préférence non mémorisée */
    }
  }, [view]);

  const cities = useAsync(() => api.properties.cities(), []);
  const { data, error, loading } = useAsync(() => api.properties.list(toFilters(debounced)), [JSON.stringify(debounced)]);
  const set = <K extends keyof FilterForm>(k: K, v: FilterForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <PageTitle actions={canWrite && <Button onClick={onCreate}>+ {t('prop.add')}</Button>}>{t('nav.properties')}</PageTitle>
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <Input className="min-w-[14rem] flex-1" placeholder={t('prop.searchPlaceholder')} value={form.q} onChange={(e) => set('q', e.target.value)} />
          <Select className="w-auto" value={form.type} onChange={(e) => set('type', e.target.value)} aria-label={t('field.type')}>
            <option value="">{t('field.type')}: {t('common.all')}</option>
            {PROPERTY_TYPES.map((x) => <option key={x} value={x}>{t(`type.${x}` as DictKey)}</option>)}
          </Select>
          <Select className="w-auto" value={form.status} onChange={(e) => set('status', e.target.value)} aria-label={t('field.status')}>
            <option value="">{t('field.status')}: {t('common.all')}</option>
            {PROPERTY_STATUSES.map((x) => <option key={x} value={x}>{t(`status.${x}` as DictKey)}</option>)}
          </Select>
          <Select className="w-auto" value={form.purpose} onChange={(e) => set('purpose', e.target.value as FilterForm['purpose'])} aria-label={t('field.purpose')}>
            <option value="">{t('field.purpose')}: {t('common.all')}</option>
            <option value="rent">{t('purpose.rent')}</option>
            <option value="sale">{t('purpose.sale')}</option>
          </Select>
          <Button variant="secondary" onClick={() => setAdvanced((a) => !a)}>{t('prop.filters')} {advanced ? '▴' : '▾'}</Button>
        </div>
        {advanced && (
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 md:grid-cols-4 xl:grid-cols-8">
            <Field label={t('field.city')}>
              <Select value={form.city} onChange={(e) => set('city', e.target.value)}>
                <option value="">{t('common.all')}</option>
                {cities.data?.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label={t('prop.priceMin')}><Input inputMode="decimal" dir="ltr" value={form.priceMin} onChange={(e) => set('priceMin', e.target.value)} /></Field>
            <Field label={t('prop.priceMax')}><Input inputMode="decimal" dir="ltr" value={form.priceMax} onChange={(e) => set('priceMax', e.target.value)} /></Field>
            <Field label={t('prop.areaMin')}><Input inputMode="decimal" dir="ltr" value={form.areaMin} onChange={(e) => set('areaMin', e.target.value)} /></Field>
            <Field label={t('prop.areaMax')}><Input inputMode="decimal" dir="ltr" value={form.areaMax} onChange={(e) => set('areaMax', e.target.value)} /></Field>
            <Field label={t('prop.roomsMin')}><Input inputMode="numeric" dir="ltr" value={form.roomsMin} onChange={(e) => set('roomsMin', e.target.value)} /></Field>
            <Field label={t('prop.sort')}>
              <Select value={form.sort} onChange={(e) => set('sort', e.target.value as FilterForm['sort'])}>
                {(['reference', 'recent', 'price_asc', 'price_desc', 'area_desc'] as const).map((s) => <option key={s} value={s}>{t(`sort.${s}`)}</option>)}
              </Select>
            </Field>
            <div className="flex flex-col justify-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={form.topLevelOnly} onChange={(e) => set('topLevelOnly', e.target.checked)} />
                {t('prop.topLevel')}
              </label>
              <Button variant="ghost" onClick={() => setForm(EMPTY)}>{t('common.reset')}</Button>
            </div>
          </div>
        )}
      </Card>

      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-muted">{data ? t('prop.count', { n: data.length }) : ''}</span>
        <div className="flex overflow-hidden rounded-lg border border-line bg-white">
          {(['grid', 'table'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={cx('px-3 py-1.5', view === v ? 'bg-brand-600 text-white' : 'hover:bg-canvas')}>
              {t(v === 'grid' ? 'prop.viewGrid' : 'prop.viewTable')}
            </button>
          ))}
        </div>
      </div>

      {error && <Alert>{error}</Alert>}
      {loading && !data ? <Spinner /> : data && data.length === 0 ? (
        <Card><p className="py-8 text-center text-muted">{t('common.none')}</p></Card>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {data?.map((p) => <PropertyCard key={p.id} p={p} onOpen={() => onOpen(p.id)} />)}
        </div>
      ) : (
        <PropertyTable rows={data ?? []} onOpen={onOpen} />
      )}
    </div>
  );
}

export function PriceTag({ p, className }: { p: { purpose: string | null; priceRentCents?: number | null; priceSaleCents?: number | null }; className?: string }) {
  const { t, lang } = useI18n();
  const rent = p.purpose !== 'sale' && p.priceRentCents != null;
  const sale = p.purpose !== 'rent' && p.priceSaleCents != null;
  if (!rent && !sale) return null;
  // Chaque prix est isolé (bidi) pour ne pas mélanger chiffres et texte arabe.
  return (
    <div className={cx('flex flex-wrap items-baseline gap-x-3 font-bold text-brand-600', className)}>
      {sale && <span className="num">{formatMoney(p.priceSaleCents!, 'MAD', lang, { decimals: false })}</span>}
      {rent && (
        <span>
          <span className="num">{formatMoney(p.priceRentCents!, 'MAD', lang, { decimals: false })}</span>
          <span className="text-xs font-semibold text-muted"> / {t('purpose.rent')}</span>
        </span>
      )}
    </div>
  );
}

function PropertyCard({ p, onOpen }: { p: PropertyListItem; onOpen(): void }) {
  const { t } = useI18n();
  return (
    <button onClick={onOpen} className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white text-start transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative w-full">
        <MediaImage sha={p.coverSha} className="aspect-[4/3] w-full" alt={p.title ?? ''} />
        <div className="absolute start-2 top-2"><Badge tone={p.status}>{t(`status.${p.status}` as DictKey)}</Badge></div>
      </div>
      <div className="w-full space-y-1 p-3">
        <PriceTag p={p} className="text-lg" />
        <div className="line-clamp-1 font-semibold">{p.title}</div>
        <div className="line-clamp-1 text-sm text-muted">{[p.district, p.city].filter(Boolean).join('، ') || '—'}</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs text-muted">
          {p.type && <span>{t(`type.${p.type}` as DictKey)}</span>}
          {p.areaM2 != null && <span className="num">{p.areaM2} m²</span>}
          {p.rooms != null && <span>{t('field.rooms')}: <span className="num">{p.rooms}</span></span>}
          {p.unitsCount > 0 && <span>{t('prop.units', { n: p.unitsCount })}</span>}
          <span className="num ms-auto">{p.reference}</span>
        </div>
      </div>
    </button>
  );
}

function PropertyTable({ rows, onOpen }: { rows: PropertyListItem[]; onOpen(id: string): void }) {
  const { t, lang } = useI18n();
  const money = (c: number | null) => (c == null ? '—' : <span className="num">{formatMoney(c, 'MAD', lang, { decimals: false })}</span>);
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-muted">
            <tr>
              {(['col.reference', 'col.title', 'col.type', 'col.status', 'col.city', 'col.area'] as const).map((k) => (
                <th key={k} className="py-2 text-start font-semibold">{t(k)}</th>
              ))}
              <th className="py-2 text-end font-semibold">{t('col.priceRent')}</th>
              <th className="py-2 text-end font-semibold">{t('col.priceSale')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} onClick={() => onOpen(p.id)} className="cursor-pointer border-t border-line hover:bg-canvas">
                <td className="py-2"><span className="num">{p.reference}</span></td>
                <td className="py-2">
                  <div className="font-semibold">{p.title}</div>
                  {p.parentTitle && <div className="text-xs text-muted">{p.parentTitle}</div>}
                </td>
                <td className="py-2">{p.type ? t(`type.${p.type}` as DictKey) : '—'}</td>
                <td className="py-2"><Badge tone={p.status}>{t(`status.${p.status}` as DictKey)}</Badge></td>
                <td className="py-2">{[p.city, p.district].filter(Boolean).join(' — ')}</td>
                <td className="py-2"><span className="num">{p.areaM2 ?? '—'}</span></td>
                <td className="py-2 text-end">{money(p.priceRentCents)}</td>
                <td className="py-2 text-end">{money(p.priceSaleCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
