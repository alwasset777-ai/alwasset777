import { useState, type FormEvent } from 'react';
import { errorMessage, useApi } from '../api';
import { Alert, Button, Field, Input } from '../components/ui';
import { useI18n } from '../i18n';

export function ChangePassword({ required, onDone }: { required?: boolean; onDone(): void }) {
  const api = useApi();
  const { t } = useI18n();
  const [oldPwd, setOld] = useState('');
  const [newPwd, setNew] = useState('');
  const [error, setError] = useState<string>();
  const [ok, setOk] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    try {
      await api.auth.changePassword(oldPwd, newPwd);
      setOk(true);
      setOld('');
      setNew('');
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <form onSubmit={submit} className="max-w-sm space-y-3">
      {required && <Alert kind="info">{t('password.mustChange')}</Alert>}
      <Field label={t('password.old')}><Input required type="password" autoComplete="current-password" value={oldPwd} onChange={(e) => setOld(e.target.value)} /></Field>
      <Field label={t('password.new')}><Input required type="password" minLength={8} autoComplete="new-password" value={newPwd} onChange={(e) => setNew(e.target.value)} /></Field>
      {error && <Alert>{error}</Alert>}
      {ok && <Alert kind="success">{t('password.changed')}</Alert>}
      <Button type="submit">{t('password.change')}</Button>
    </form>
  );
}
