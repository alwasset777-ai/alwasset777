/**
 * Tous les montants sont des entiers en centimes : aucune erreur d'arrondi
 * flottant ne peut s'accumuler dans les échéanciers ou la comptabilité.
 */
export type Cents = number;

export function assertCents(v: number, what = 'montant'): void {
  if (!Number.isSafeInteger(v)) throw new Error(`${what} doit être un entier en centimes : ${v}`);
}

/** Arrondi « demi vers l'extérieur » d'un nombre de centimes non entier. */
export function roundCents(v: number): Cents {
  return Math.sign(v) * Math.round(Math.abs(v));
}

/** Applique un taux exprimé en points de base (2000 = 20 %). */
export function applyRate(amount: Cents, rateBp: number): Cents {
  return roundCents((amount * rateBp) / 10000);
}

/**
 * Répartit `total` selon des poids, en garantissant que la somme des parts
 * vaut exactement `total` (méthode du plus fort reste).
 */
export function splitByWeights(total: Cents, weights: number[]): Cents[] {
  assertCents(total, 'total');
  const sumW = weights.reduce((a, b) => a + b, 0);
  if (weights.length === 0 || sumW <= 0) throw new Error('Poids invalides');
  const raw = weights.map((w) => (total * w) / sumW);
  const parts = raw.map((r) => Math.trunc(r));
  let rest = total - parts.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: Math.abs(r - Math.trunc(r)) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  const step = Math.sign(rest);
  for (let k = 0; rest !== 0; k = (k + 1) % order.length) {
    parts[order[k]!.i]! += step;
    rest -= step;
  }
  return parts;
}

/** Parts égales ; le reste éventuel va aux dernières échéances. */
export function splitEvenly(total: Cents, count: number): Cents[] {
  assertCents(total, 'total');
  if (!Number.isInteger(count) || count <= 0) throw new Error('Nombre de parts invalide');
  const base = Math.trunc(total / count);
  const rest = total - base * count;
  return Array.from({ length: count }, (_, i) => base + (i >= count - Math.abs(rest) ? Math.sign(rest) : 0));
}

/** Convertit une saisie ("12 500,50", "12500.5") en centimes. */
export function parseMoney(input: string): Cents {
  const cleaned = input.replace(/[\s  ]/g, '').replace(/[^\d,.-]/g, '');
  if (!cleaned) throw new Error(`Montant invalide : ${input}`);
  const lastSep = Math.max(cleaned.lastIndexOf(','), cleaned.lastIndexOf('.'));
  let intPart = cleaned;
  let decPart = '';
  if (lastSep >= 0 && cleaned.length - lastSep - 1 <= 2) {
    intPart = cleaned.slice(0, lastSep);
    decPart = cleaned.slice(lastSep + 1);
  }
  intPart = intPart.replace(/[,.]/g, '');
  const negative = intPart.startsWith('-');
  const digits = intPart.replace('-', '') || '0';
  if (!/^\d+$/.test(digits) || !/^\d*$/.test(decPart)) throw new Error(`Montant invalide : ${input}`);
  const cents = Number(digits) * 100 + Number(decPart.padEnd(2, '0') || '0');
  return negative ? -cents : cents;
}

// Usage marocain : espace pour les milliers, virgule décimale, chiffres latins.
const LOCALES: Record<string, string> = { ar: 'fr-FR', fr: 'fr-FR', en: 'en-US' };

/** Affiche un montant : « 12 500,00 MAD » (fr), « 12 500,00 د.م. » (ar). */
export function formatMoney(amount: Cents, currency = 'MAD', lang = 'fr', opts: { decimals?: boolean } = {}): string {
  const digits = opts.decimals === false ? 0 : 2;
  const n = new Intl.NumberFormat(`${LOCALES[lang] ?? 'fr-FR'}-u-nu-latn`, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount / 100);
  return `${n} ${currency === 'MAD' && lang === 'ar' ? 'د.م.' : currency}`;
}
