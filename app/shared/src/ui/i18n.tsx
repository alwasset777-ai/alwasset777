import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { dirOf, translate, type DictKey, type Lang } from '../i18n/index';

interface I18nValue {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  setLang(l: Lang): void;
  t(key: DictKey, vars?: Record<string, string | number>): string;
}

const Ctx = createContext<I18nValue | null>(null);

export function I18nProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initial);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dirOf(lang);
  }, [lang]);
  const t = useCallback((key: DictKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
  const value = useMemo(() => ({ lang, dir: dirOf(lang), setLang, t }), [lang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('I18nProvider manquant');
  return v;
}
