import { useState } from 'react';
import { formatMoney } from '../../finance/money';
import type { DictKey } from '../../i18n/index';
import { useApi, useAsync } from '../api';
import { Alert, Badge, Card, Input, PageTitle, Select, Spinner } from '../components/ui';
import { useI18n } from '../i18n';

const STATUSES = ['available', 'reserved', 'rented', 'sold', 'maintenance'];

export function PropertiesPage() {
  const api = useApi();
  const { t, lang } = useI18n();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const { data, error, loading } = useAsync(() => api.properties.list({ q, status: status || undefined }), [q, status]);
  const money = (c: number | null) => (c == null ? '—' : <span className="num">{formatMoney(c, 'MAD', lang)}</span>);

  return (
    <div>
      <PageTitle>{t('nav.properties')}</PageTitle>
      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <Input className="max-w-xs" placeholder={t('common.search')} value={q} onChange={(e) => setQ(e.target.value)} />
          <Select className="max-w-[12rem]" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t('common.all')}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}` as DictKey)}</option>)}
          </Select>
        </div>
        {error && <Alert>{error}</Alert>}
        {loading && !data ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
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
                {data?.map((p) => (
                  <tr key={p.id} className="border-t border-line hover:bg-canvas">
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
            {data?.length === 0 && <p className="py-6 text-center text-sm text-muted">{t('common.none')}</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
