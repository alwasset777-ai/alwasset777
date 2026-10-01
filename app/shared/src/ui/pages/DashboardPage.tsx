import { formatMoney } from '../../finance/money';
import { todayIso } from '../../finance/dates';
import type { DictKey } from '../../i18n/index';
import { useApi, useAsync } from '../api';
import { Alert, Badge, Card, PageTitle, Spinner, Stat } from '../components/ui';
import { useI18n } from '../i18n';

export function DashboardPage() {
  const api = useApi();
  const { t, lang } = useI18n();
  const { data: k, error, loading } = useAsync(() => api.dashboard.kpis(), []);
  const money = (c: number) => <span className="num">{formatMoney(c, 'MAD', lang)}</span>;
  // Indicateurs : montants arrondis au dirham pour rester lisibles.
  const kpiMoney = (c: number) => <span className="num">{formatMoney(c, 'MAD', lang, { decimals: false })}</span>;
  const today = todayIso();

  if (loading && !k) return <Spinner />;
  if (error) return <Alert>{error}</Alert>;
  if (!k) return null;
  return (
    <div className="space-y-6">
      <PageTitle>{t('nav.dashboard')}</PageTitle>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <Stat label={t('dashboard.properties')} value={<span className="num">{k.propertiesTotal}</span>} />
        <Stat label={t('dashboard.occupancy')} value={<span className="num">{(k.occupancyRateBp / 100).toFixed(0)} %</span>} />
        <Stat label={t('dashboard.activeContracts')} value={<span className="num">{k.activeContracts}</span>} />
        <Stat accent label={`${t('dashboard.overdue')} (${k.overdueCount})`} value={kpiMoney(k.overdueCents)} />
        <Stat label={t('dashboard.dueNext30')} value={kpiMoney(k.dueNext30Cents)} />
        <Stat label={t('dashboard.collectedMonth')} value={kpiMoney(k.collectedThisMonthCents)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title={t('dashboard.upcoming')} className="lg:col-span-2">
          {k.upcoming.length === 0 ? (
            <p className="text-sm text-muted">{t('common.none')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-start text-muted">
                  <tr>
                    <th className="py-2 text-start font-semibold">{t('col.contract')}</th>
                    <th className="py-2 text-start font-semibold">{t('col.person')}</th>
                    <th className="py-2 text-start font-semibold">{t('col.dueDate')}</th>
                    <th className="py-2 text-end font-semibold">{t('col.amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {k.upcoming.map((u, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="py-2"><span className="num">{u.contractRef}</span></td>
                      <td className="py-2">{u.personName}</td>
                      <td className={`py-2 ${u.dueDate < today ? 'font-bold text-brand-600' : ''}`}><span className="num">{u.dueDate}</span></td>
                      <td className="py-2 text-end">{money(u.outstandingCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title={t('dashboard.byStatus')}>
          <ul className="space-y-2">
            {Object.entries(k.byStatus).map(([status, n]) => (
              <li key={status} className="flex items-center justify-between">
                <Badge tone={status}>{t(`status.${status}` as DictKey)}</Badge>
                <span className="num font-semibold">{n}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
