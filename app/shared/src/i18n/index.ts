import { ar, type DictKey } from './ar';
import { en } from './en';
import { fr } from './fr';

export type Lang = 'ar' | 'fr' | 'en';
export type { DictKey };

export const LANGS: { code: Lang; label: string; dir: 'rtl' | 'ltr' }[] = [
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'en', label: 'English', dir: 'ltr' },
];

const DICTS: Record<Lang, Record<DictKey, string>> = { ar, fr, en };

export function isLang(v: unknown): v is Lang {
  return v === 'ar' || v === 'fr' || v === 'en';
}

export function dirOf(lang: Lang): 'rtl' | 'ltr' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

export function translate(lang: Lang, key: DictKey, vars?: Record<string, string | number>): string {
  let s = DICTS[lang][key] ?? DICTS.ar[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
