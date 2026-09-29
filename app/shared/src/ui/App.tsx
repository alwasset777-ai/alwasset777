import { useEffect, useState, type ReactNode } from 'react';
import type { AppApi, SessionUser } from '../api/contract';
import { can, type Permission } from '../auth/permissions';
import { isLang, LANGS, type DictKey, type Lang } from '../i18n/index';
import { ApiProvider, useApi } from './api';
import { Button, Card, cx, PageTitle, Spinner } from './components/ui';
import { Logo } from './components/Logo';
import { I18nProvider, useI18n } from './i18n';
import { ChangePassword } from './pages/ChangePassword';
import { DashboardPage } from './pages/DashboardPage';
import { DevicesPage } from './pages/DevicesPage';
import { LoginPage } from './pages/LoginPage';
import { PropertiesPage } from './pages/properties/PropertiesPage';
import { SettingsPage } from './pages/SettingsPage';
import { SetupPage } from './pages/SetupPage';

type Route =
  | 'dashboard' | 'properties' | 'persons' | 'leads' | 'contracts' | 'reservations' | 'expenses'
  | 'invoices' | 'maintenance' | 'appointments' | 'partners' | 'notifications' | 'reports'
  | 'devices' | 'settings';

interface NavItem {
  route: Route;
  module?: string;
  perm: Permission;
  ready: boolean;
  desktopOnly?: boolean;
}

/** Menu dans l'ordre des modules M1 → M12 ; `ready` passe à true module par module. */
const NAV: NavItem[] = [
  { route: 'dashboard', perm: 'dashboard.read', ready: true },
  { route: 'properties', module: 'M1', perm: 'properties.read', ready: true },
  { route: 'persons', module: 'M2', perm: 'persons.read', ready: false },
  { route: 'leads', module: 'M3', perm: 'leads.read', ready: false },
  { route: 'contracts', module: 'M4', perm: 'contracts.read', ready: false },
  { route: 'reservations', module: 'M5', perm: 'reservations.write', ready: false },
  { route: 'expenses', module: 'M6', perm: 'accounting.read', ready: false },
  { route: 'invoices', module: 'M7', perm: 'invoices.write', ready: false },
  { route: 'maintenance', module: 'M8', perm: 'maintenance.read', ready: false },
  { route: 'appointments', module: 'M9', perm: 'appointments.write', ready: false },
  { route: 'partners', module: 'M10', perm: 'partners.write', ready: false },
  { route: 'notifications', module: 'M11', perm: 'dashboard.read', ready: false },
  { route: 'reports', module: 'M12', perm: 'reports.read', ready: false },
  { route: 'devices', perm: 'devices.manage', ready: true, desktopOnly: true },
  { route: 'settings', perm: 'dashboard.read', ready: true },
];

const LANG_KEY = 'alwasset.lang';

function storedLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return isLang(v) ? v : 'ar';
  } catch {
    return 'ar';
  }
}

export interface AlWassetAppProps {
  api: AppApi;
  /** Barre d'état supplémentaire (ex. état de synchro sur mobile). */
  statusBar?: ReactNode;
  /** À incrémenter quand les données changent en arrière-plan (synchro). */
  dataVersion?: number;
}

export function AlWassetApp({ api, statusBar, dataVersion }: AlWassetAppProps) {
  return (
    <ApiProvider api={api} dataVersion={dataVersion}>
      <I18nProvider initial={storedLang()}>
        <Root statusBar={statusBar} />
      </I18nProvider>
    </ApiProvider>
  );
}

function Root({ statusBar }: { statusBar?: ReactNode }) {
  const api = useApi();
  const { lang, setLang } = useI18n();
  const [phase, setPhase] = useState<'loading' | 'setup' | 'login' | 'app'>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* stockage indisponible : la langue reste celle de la session */
    }
  }, [lang]);

  async function boot() {
    if (await api.app.needsSetup()) return setPhase('setup');
    const u = await api.auth.current();
    if (u) {
      setUser(u);
      setLang(u.language);
      setPhase('app');
    } else setPhase('login');
  }

  useEffect(() => {
    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === 'loading') {
    return <div className="flex h-full items-center justify-center"><Spinner /></div>;
  }
  if (phase === 'setup') return <SetupPage onDone={() => void boot()} />;
  if (phase === 'login' || !user) {
    return <LoginPage onLogin={(u) => { setUser(u); setLang(u.language); setPhase('app'); }} />;
  }
  return (
    <Shell
      user={user}
      statusBar={statusBar}
      onPasswordChanged={() => setUser({ ...user, mustChangePassword: false })}
      onLogout={async () => {
        await api.auth.logout();
        setUser(null);
        setPhase('login');
      }}
    />
  );
}

function Shell({ user, statusBar, onLogout, onPasswordChanged }: { user: SessionUser; statusBar?: ReactNode; onLogout(): void; onPasswordChanged(): void }) {
  const api = useApi();
  const { t, lang, setLang } = useI18n();
  const [route, setRoute] = useState<Route>('dashboard');
  // Un clic dans le menu ramène toujours à l'écran d'accueil du module.
  const [navNonce, setNavNonce] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const items = NAV.filter((n) => can(user.role, n.perm) && !(n.desktopOnly && api.platform !== 'desktop'));
  const current = items.find((n) => n.route === route) ?? items[0]!;

  let page: ReactNode;
  if (user.mustChangePassword && api.platform === 'desktop') {
    page = <Card title={t('password.change')}><ChangePassword required onDone={onPasswordChanged} /></Card>;
  } else if (!current.ready) {
    page = <ComingSoon label={t(`nav.${current.route}` as DictKey)} module={current.module} />;
  } else {
    page = {
      dashboard: <DashboardPage />,
      properties: <PropertiesPage canWrite={can(user.role, 'properties.write')} />,
      devices: <DevicesPage />,
      settings: <SettingsPage user={user} canManageUsers={can(user.role, 'users.manage')} />,
    }[current.route as 'dashboard' | 'properties' | 'devices' | 'settings'];
  }

  return (
    <div className="flex h-full">
      <aside
        className={cx(
          'fixed inset-y-0 start-0 z-30 w-64 shrink-0 overflow-y-auto border-e border-line bg-white transition-transform lg:static',
          // Sur petit écran, le menu glisse depuis le bord de début (droite en arabe).
          !menuOpen && 'max-lg:ltr:-translate-x-full max-lg:rtl:translate-x-full',
        )}
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-4">
          <Logo />
          <div className="leading-tight">
            <div className="font-bold">{t('app.name')}</div>
            <div className="text-xs text-muted">{t('app.tagline')}</div>
          </div>
        </div>
        <nav className="p-2">
          {items.map((n) => (
            <button
              key={n.route}
              onClick={() => { setRoute(n.route); setNavNonce((x) => x + 1); setMenuOpen(false); }}
              className={cx(
                'flex w-full items-center justify-between rounded-lg px-3 py-2 text-start text-sm',
                n.route === current.route ? 'bg-brand-50 font-bold text-brand-600' : 'text-ink hover:bg-canvas',
              )}
            >
              <span>{t(`nav.${n.route}` as DictKey)}</span>
              {!n.ready && <span className="text-[10px] text-muted">{n.module}</span>}
            </button>
          ))}
        </nav>
      </aside>
      {menuOpen && <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setMenuOpen(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-line bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <button className="rounded-lg p-2 hover:bg-canvas lg:hidden" onClick={() => setMenuOpen(true)} aria-label="menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
            </button>
            {statusBar}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <select value={lang} onChange={(e) => { const l = e.target.value as Lang; setLang(l); void api.auth.setLanguage(l); }} className="rounded-md border border-line bg-white px-2 py-1">
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
            <span className="hidden sm:inline">{user.fullName} · <span className="text-muted">{t(`role.${user.role}` as DictKey)}</span></span>
            {api.platform === 'desktop' && <Button variant="ghost" onClick={onLogout}>{t('common.logout')}</Button>}
          </div>
        </header>
        <main key={`${current.route}-${navNonce}`} className="flex-1 overflow-y-auto bg-canvas p-4 lg:p-6">{page}</main>
      </div>
    </div>
  );
}

function ComingSoon({ label, module }: { label: string; module?: string }) {
  const { t } = useI18n();
  return (
    <div>
      <PageTitle>{label}</PageTitle>
      <Card>
        <p className="text-muted">{t('common.soon')} — <span className="num">{module}</span></p>
      </Card>
    </div>
  );
}
