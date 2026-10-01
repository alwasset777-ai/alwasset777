import { addMonths, diffDays, parseDate, type IsoDate } from './dates';
import { applyRate, assertCents, roundCents, splitEvenly, type Cents } from './money';
import { FREQUENCY_MONTHS, type Frequency, type PlannedInstallment } from './schedule';

export type InstallmentStatus = 'pending' | 'partial' | 'paid' | 'cancelled' | 'rescheduled';

export interface InstallmentState {
  id: string;
  dueDate: IsoDate;
  amountCents: Cents;
  paidCents: Cents;
  status: InstallmentStatus;
}

export function outstanding(i: Pick<InstallmentState, 'amountCents' | 'paidCents' | 'status'>): Cents {
  if (i.status === 'cancelled' || i.status === 'rescheduled') return 0;
  return Math.max(0, i.amountCents - i.paidCents);
}

export function statusFor(amountCents: Cents, paidCents: Cents): InstallmentStatus {
  if (paidCents <= 0) return 'pending';
  return paidCents >= amountCents ? 'paid' : 'partial';
}

export function isOverdue(i: InstallmentState, asOf: IsoDate): boolean {
  return outstanding(i) > 0 && diffDays(i.dueDate, asOf) > 0;
}

export interface Allocation {
  installmentId: string;
  amountCents: Cents;
  newPaidCents: Cents;
  newStatus: InstallmentStatus;
}

/**
 * Impute un paiement sur les échéances, de la plus ancienne à la plus
 * récente. Le surplus éventuel est retourné comme avoir (`creditCents`).
 */
export function allocatePayment(
  amountCents: Cents,
  installments: InstallmentState[],
): { allocations: Allocation[]; creditCents: Cents } {
  assertCents(amountCents, 'paiement');
  if (amountCents <= 0) throw new Error('Le paiement doit être positif');
  let left = amountCents;
  const allocations: Allocation[] = [];
  const open = installments
    .filter((i) => outstanding(i) > 0)
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));
  for (const inst of open) {
    if (left === 0) break;
    const take = Math.min(left, outstanding(inst));
    const newPaid = inst.paidCents + take;
    allocations.push({
      installmentId: inst.id,
      amountCents: take,
      newPaidCents: newPaid,
      newStatus: statusFor(inst.amountCents, newPaid),
    });
    left -= take;
  }
  return { allocations, creditCents: left };
}

export interface PenaltyRule {
  /** Taux par mois de retard, en points de base (100 = 1 %/mois). */
  rateBpPerMonth: number;
  /** Jours de tolérance avant d'appliquer une pénalité. */
  graceDays: number;
}

/**
 * Pénalité de retard au prorata des jours (base 30 jours/mois), calculée
 * sur le reste dû et seulement au-delà du délai de grâce.
 */
export function latePenalty(i: InstallmentState, asOf: IsoDate, rule: PenaltyRule): Cents {
  const due = outstanding(i);
  const late = diffDays(i.dueDate, asOf);
  if (due === 0 || late <= rule.graceDays || rule.rateBpPerMonth <= 0) return 0;
  return roundCents((applyRate(due, rule.rateBpPerMonth) * late) / 30);
}

export interface RescheduleInput {
  /** Échéances existantes du contrat. */
  installments: (InstallmentState & { seq: number })[];
  /** Nombre de nouvelles échéances. */
  count: number;
  firstDueDate: IsoDate;
  frequency: Frequency;
}

export interface RescheduleResult {
  /** Échéances à clôturer : leur montant est ramené à ce qui a été payé. */
  close: { id: string; amountCents: Cents; status: InstallmentStatus }[];
  create: PlannedInstallment[];
  totalRescheduledCents: Cents;
}

/**
 * Re-programme tout le reste dû : les échéances ouvertes sont clôturées
 * (partie payée conservée) et le solde est réparti sur de nouvelles échéances.
 * Le total dû du contrat est inchangé.
 */
export function reschedule(input: RescheduleInput): RescheduleResult {
  const open = input.installments.filter((i) => outstanding(i) > 0);
  const total = open.reduce((s, i) => s + outstanding(i), 0);
  const close = open.map((i) => ({
    id: i.id,
    amountCents: i.paidCents,
    status: (i.paidCents > 0 ? 'paid' : 'rescheduled') as InstallmentStatus,
  }));
  if (total === 0) return { close: [], create: [], totalRescheduledCents: 0 };
  const lastSeq = Math.max(0, ...input.installments.map((i) => i.seq));
  const months = FREQUENCY_MONTHS[input.frequency];
  const anchor = parseDate(input.firstDueDate).day;
  const create = splitEvenly(total, input.count).map((amount, k) => {
    const due = addMonths(input.firstDueDate, k * months, anchor);
    return { seq: lastSeq + k + 1, periodStart: due, periodEnd: due, dueDate: due, amountCents: amount };
  });
  return { close, create, totalRescheduledCents: total };
}
