import { useState, type FormEvent } from 'react';
import type { SessionUser } from '../../api/contract';
import { LANGS, type Lang } from '../../i18n/index';
import { useApi } from '../api';
import { Alert, Button, Field, Input } from '../components/ui';
import { Logo } from '../components/Logo';
import { useI18n } from '../i18n';

export function LoginPage({ onLogin }: { onLogin(u: SessionUser): void }) {
  const api = useApi();
  const { t, lang, setLang } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFailed(false);
    try {
      onLogin(await api.auth.login(username, password));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-canvas p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo size={56} />
          <h1 className="text-2xl font-bold">{t('app.name')}</h1>
          <p className="text-sm text-muted">{t('login.title')}</p>
        </div>
        <Field label={t('login.username')}>
          <Input required dir="ltr" autoFocus autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        <Field label={t('login.password')}>
          <Input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {failed && <Alert>{t('login.failed')}</Alert>}
        <Button type="submit" disabled={busy} className="w-full py-3">{t('login.submit')}</Button>
        <div className="flex justify-center gap-3 text-sm">
          {LANGS.map((l) => (
            <button key={l.code} type="button" onClick={() => setLang(l.code as Lang)} className={l.code === lang ? 'font-bold text-brand-600' : 'text-muted hover:text-ink'}>
              {l.label}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
