import { addDays, addMonths, diffDays, parseDate, type IsoDate } from './dates';
import { assertCents, roundCents, splitEvenly, type Cents } from './money';

export type Frequency = 'monthly' | 'quarterly' | 'semiannual' | 'annual';

export const FREQUENCY_MONTHS: Record<Frequency, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

export interface PlannedInstallment {
  seq: number;
  periodStart: IsoDate;
  periodEnd: IsoDate;
  dueDate: IsoDate;
  amountCents: Cents;
}

export interface RentScheduleInput {
  startDate: IsoDate;
  /** Date de fin incluse du bail. */
  endDate: IsoDate;
  /** Montant d'une période complète (loyer mensuel × nb de mois de la période). */
  periodAmountCents: Cents;
  frequency: Frequency;
  /** Jours après le début de période pour l'échéance (0 = payable d'avance). */
  dueOffsetDays?: number;
}

/**
 * Échéancier de location : découpe le bail en périodes. La dernière période,
 * si elle est incomplète, est facturée au prorata des jours.
 */
export function rentSchedule(input: RentScheduleInput): PlannedInstallment[] {
  const { startDate, endDate, periodAmountCents, frequency } = input;
  assertCents(periodAmountCents, 'loyer');
  if (periodAmountCents < 0) throw new Error('Le loyer ne peut pas être négatif');
  if (diffDays(startDate, endDate) < 0) throw new Error('La date de fin précède la date de début');
  const months = FREQUENCY_MONTHS[frequency];
  const anchor = parseDate(startDate).day;
  const out: PlannedInstallment[] = [];
  for (let i = 0; ; i++) {
    const periodStart = addMonths(startDate, i * months, anchor);
    if (diffDays(periodStart, endDate) < 0) break;
    const nextStart = addMonths(startDate, (i + 1) * months, anchor);
    const fullEnd = addDays(nextStart, -1);
    const truncated = diffDays(fullEnd, endDate) < 0;
    const periodEnd = truncated ? endDate : fullEnd;
    const amount = truncated
      ? roundCents((periodAmountCents * (diffDays(periodStart, periodEnd) + 1)) / (diffDays(periodStart, fullEnd) + 1))
      : periodAmountCents;
    out.push({
      seq: i + 1,
      periodStart,
      periodEnd,
      dueDate: addDays(periodStart, input.dueOffsetDays ?? 0),
      amountCents: amount,
    });
    if (truncated) break;
  }
  return out;
}

export interface SaleScheduleInput {
  totalCents: Cents;
  /** Avance versée à la signature (échéance n°1). */
  downPaymentCents?: Cents;
  /** Nombre d'échéances après l'avance. */
  count: number;
  firstDueDate: IsoDate;
  frequency: Frequency;
}

/**
 * Échéancier de vente : avance + N échéances égales ; la somme est
 * toujours exactement égale au prix total.
 */
export function saleSchedule(input: SaleScheduleInput): PlannedInstallment[] {
  const down = input.downPaymentCents ?? 0;
  assertCents(input.totalCents, 'prix');
  assertCents(down, 'avance');
  if (down < 0 || down > input.totalCents) throw new Error('Avance invalide');
  const months = FREQUENCY_MONTHS[input.frequency];
  const anchor = parseDate(input.firstDueDate).day;
  const out: PlannedInstallment[] = [];
  if (down > 0) {
    out.push({
      seq: 1,
      periodStart: input.firstDueDate,
      periodEnd: input.firstDueDate,
      dueDate: input.firstDueDate,
      amountCents: down,
    });
  }
  const remaining = input.totalCents - down;
  if (remaining > 0) {
    const parts = splitEvenly(remaining, input.count);
    const offset = down > 0 ? 1 : 0;
    parts.forEach((amount, i) => {
      const due = addMonths(input.firstDueDate, (i + offset) * months, anchor);
      out.push({ seq: out.length + 1, periodStart: due, periodEnd: due, dueDate: due, amountCents: amount });
    });
  }
  return out;
}
