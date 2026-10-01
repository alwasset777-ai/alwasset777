import { useEffect, useState } from 'react';
import type { PairingOffer } from '../../api/contract';
import type { DictKey } from '../../i18n/index';
import { errorMessage, useApi, useAsync } from '../api';
import { Alert, Button, Card, Field, PageTitle, Select } from '../components/ui';
import { useI18n } from '../i18n';

export function DevicesPage() {
  const api = useApi();
  const { t } = useI18n();
  const users = useAsync(() => api.users.list(), []);
  const devices = useAsync(() => api.devices.list(), []);
  const [userId, setUserId] = useState('');
  const [address, setAddress] = useState<string>();
  const [offer, setOffer] = useState<PairingOffer>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!userId && users.data?.[0]) setUserId(users.data[0].id);
  }, [users.data, userId]);

  // Rafraîchit la liste : l'appareil apparaît dès qu'il a scanné le code.
  useEffect(() => {
    if (!offer) return;
    const timer = setInterval(devices.reload, 3000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer]);

  async function generate(addr = address) {
    setError(undefined);
    try {
      const o = await api.devices.createPairing(userId, addr);
      setOffer(o);
      setAddress(addr ?? o.addresses[0]);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle>{t('nav.devices')}</PageTitle>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t('devices.pairTitle')}>
          <div className="space-y-4">
            <p className="text-sm text-muted">{t('devices.pairHelp')}</p>
            <Field label={t('devices.forUser')}>
              <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
                {users.data?.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName} — {t(`role.${u.role}` as DictKey)}</option>
                ))}
              </Select>
            </Field>
            {offer && offer.addresses.length > 1 && (
              <Field label={t('devices.address')}>
                <Select value={address} onChange={(e) => void generate(e.target.value)}>
                  {offer.addresses.map((a) => <option key={a} value={a}>{a}</option>)}
                </Select>
              </Field>
            )}
            <Button onClick={() => void generate()} disabled={!userId}>{t('devices.generate')}</Button>
            {error && <Alert>{error}</Alert>}
            {offer && (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-line p-4">
                <img src={offer.qrDataUrl} alt="QR" className="h-64 w-64" />
                <code dir="ltr" className="break-all text-center text-xs text-muted">{offer.url.split('#')[0]}</code>
                <span className="text-xs text-muted">
                  {t('devices.expires')} <span className="num">{new Date(offer.expiresAt).toLocaleTimeString()}</span>
                </span>
              </div>
            )}
          </div>
        </Card>
        <Card title={t('devices.title')}>
          {devices.data?.length === 0 && <p className="text-sm text-muted">{t('common.none')}</p>}
          <ul className="divide-y divide-line">
            {devices.data?.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <div className="font-semibold">{d.name} <span className="text-xs text-muted">({d.platform})</span></div>
                  <div className="text-xs text-muted">
                    {d.userName} · {t('devices.lastSeen')}: <span className="num">{d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : '—'}</span>
                  </div>
                </div>
                {d.revoked ? (
                  <span className="text-xs font-semibold text-muted">{t('devices.revoked')}</span>
                ) : (
                  <Button variant="danger" onClick={() => void api.devices.revoke(d.id).then(devices.reload)}>{t('devices.revoke')}</Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
