import { useState, type FormEvent } from 'react';
import { LANGS, type Lang } from '../../i18n/index';
import { errorMessage, useApi } from '../api';
import { Alert, Button, Field, Input, Select } from '../components/ui';
import { Logo } from '../components/Logo';
import { useI18n } from '../i18n';

export function SetupPage({ onDone }: { onDone(): void }) {
  const api = useApi();
  const { t, lang, setLang } = useI18n();
  const [form, setForm] = useState({
    agencyName: 'الوسيط 777',
    city: 'الدار البيضاء',
    adminFullName: '',
    adminUsername: 'admin',
    adminPassword: '',
    withDemoData: true,
  });
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api.app.setup({ ...form, language: lang });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-canvas p-6">
      <form onSubmit={submit} className="w-full max-w-lg space-y-4 rounded-2xl border border-line bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <Logo size={44} />
          <div>
            <h1 className="text-xl font-bold">{t('setup.title')}</h1>
            <p className="text-sm text-muted">{t('app.tagline')}</p>
          </div>
        </div>
        <Field label={t('settings.language')}>
          <Select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('setup.agencyName')}><Input required value={form.agencyName} onChange={set('agencyName')} /></Field>
          <Field label={t('setup.city')}><Input value={form.city} onChange={set('city')} /></Field>
        </div>
        <Field label={t('setup.adminFullName')}><Input required value={form.adminFullName} onChange={set('adminFullName')} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('setup.adminUsername')}><Input required dir="ltr" autoComplete="username" value={form.adminUsername} onChange={set('adminUsername')} /></Field>
          <Field label={t('setup.adminPassword')}><Input required type="password" minLength={8} autoComplete="new-password" value={form.adminPassword} onChange={set('adminPassword')} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={form.withDemoData} onChange={(e) => setForm({ ...form, withDemoData: e.target.checked })} />
          {t('setup.demo')}
        </label>
        {error && <Alert>{error}</Alert>}
        <Button type="submit" disabled={busy} className="w-full py-3">{t('setup.submit')}</Button>
      </form>
    </div>
  );
}
