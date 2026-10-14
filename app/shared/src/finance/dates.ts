/**
 * Dates « métier » au format 'YYYY-MM-DD', manipulées en UTC pour éviter
 * tout décalage lié au fuseau horaire ou à l'heure d'été.
 */
export type IsoDate = string;

const RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDate(d: IsoDate): { y: number; m: number; day: number } {
  const m = RE.exec(d);
  if (!m) throw new Error(`Date invalide : ${d}`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  if (mo < 1 || mo > 12 || day < 1 || day > daysInMonth(y, mo)) throw new Error(`Date invalide : ${d}`);
  return { y, m: mo, day };
}

export function toIso(y: number, m: number, day: number): IsoDate {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function toEpochDay(d: IsoDate): number {
  const { y, m, day } = parseDate(d);
  return Date.UTC(y, m - 1, day) / 86_400_000;
}

function fromEpochDay(n: number): IsoDate {
  const dt = new Date(n * 86_400_000);
  return toIso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function addDays(d: IsoDate, n: number): IsoDate {
  return fromEpochDay(toEpochDay(d) + n);
}

/** Nombre de jours de `a` à `b` (positif si b est après a). */
export function diffDays(a: IsoDate, b: IsoDate): number {
  return toEpochDay(b) - toEpochDay(a);
}

/**
 * Ajoute des mois en gardant le jour d'ancrage, borné à la fin du mois :
 * 31/01 + 1 mois → 28/02 (ou 29/02), puis 31/03 si l'ancrage est 31.
 */
export function addMonths(d: IsoDate, n: number, anchorDay?: number): IsoDate {
  const { y, m, day } = parseDate(d);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return toIso(ny, nm, Math.min(anchorDay ?? day, daysInMonth(ny, nm)));
}

export function todayIso(now: Date = new Date()): IsoDate {
  return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function compareDates(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
