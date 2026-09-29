import type { SessionUser } from '../../api/contract';
import { LANGS, type DictKey, type Lang } from '../../i18n/index';
import { useApi, useAsync } from '../api';
import { Card, PageTitle, Select } from '../components/ui';
import { useI18n } from '../i18n';
import { ChangePassword } from './ChangePassword';
import { CustomFieldsCard } from './CustomFieldsCard';
import { can } from '../../auth/permissions';

export function SettingsPage({ user, canManageUsers }: { user: SessionUser; canManageUsers: boolean }) {
  const api = useApi();
  const { t, lang, setLang } = useI18n();
  const info = useAsync(() => api.app.info(), []);
  const users = useAsync(() => (canManageUsers ? api.users.list() : Promise.resolve([])), [canManageUsers]);

  async function changeLang(l: Lang) {
    setLang(l);
    await api.auth.setLanguage(l);
  }

  return (
    <div className="space-y-6">
      <PageTitle>{t('nav.settings')}</PageTitle>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t('settings.language')}>
          <Select value={lang} onChange={(e) => void changeLang(e.target.value as Lang)} className="max-w-xs">
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </Select>
        </Card>
        {api.platform === 'desktop' && (
          <Card title={t('password.change')}>
            <ChangePassword onDone={() => undefined} />
          </Card>
        )}
        {canManageUsers && (
          <Card title={t('settings.users')}>
            <ul className="divide-y divide-line text-sm">
              {users.data?.map((u) => (
                <li key={u.id} className="flex justify-between py-2">
                  <span>{u.fullName} <span dir="ltr" className="text-muted">@{u.username}</span></span>
                  <span className="text-muted">{t(`role.${u.role}` as DictKey)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {can(user.role, 'settings.manage') && <CustomFieldsCard />}
        <Card title={t('settings.about')}>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted">{t('setup.agencyName')}</dt><dd>{info.data?.agencyName}</dd>
            <dt className="text-muted">Version</dt><dd className="num">{info.data?.version}</dd>
            <dt className="text-muted">{t('login.username')}</dt><dd dir="ltr">{user.username}</dd>
          </dl>
        </Card>
      </div>
    </div>
  );
}
