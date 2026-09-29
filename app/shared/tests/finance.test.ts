import { describe, expect, it } from 'vitest';
import { addMonths, diffDays } from '../src/finance/dates';
import { allocatePayment, isOverdue, latePenalty, outstanding, reschedule, type InstallmentState } from '../src/finance/installments';
import { assertBalanced, profitAndLoss } from '../src/finance/ledger';
import { applyRate, formatMoney, parseMoney, splitByWeights, splitEvenly } from '../src/finance/money';
import { rentSchedule, saleSchedule } from '../src/finance/schedule';

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

describe('money', () => {
  it('splitEvenly garde le total exact', () => {
    expect(splitEvenly(100000, 3)).toEqual([33333, 33333, 33334]);
    expect(sum(splitEvenly(1, 7))).toBe(1);
    expect(sum(splitEvenly(-10, 3))).toBe(-10);
  });
  it('splitByWeights (plus fort reste) garde le total exact', () => {
    const parts = splitByWeights(1000, [1, 1, 1]);
    expect(sum(parts)).toBe(1000);
    expect(splitByWeights(10000, [5000, 3000, 2000])).toEqual([5000, 3000, 2000]);
  });
  it('applyRate en points de base', () => {
    expect(applyRate(100000, 2000)).toBe(20000); // TVA 20 %
    expect(applyRate(333, 2000)).toBe(67);
  });
  it('parseMoney accepte les formats marocains/français/anglais', () => {
    expect(parseMoney('12 500,50')).toBe(1250050);
    expect(parseMoney('12,500.50')).toBe(1250050);
    expect(parseMoney('7500')).toBe(750000);
    expect(parseMoney('1.250.000')).toBe(125000000);
    expect(() => parseMoney('abc')).toThrow();
  });
  it('formatMoney', () => {
    expect(formatMoney(1250050, 'MAD', 'en')).toBe('12,500.50 MAD');
    expect(formatMoney(750000, 'MAD', 'ar')).toContain('د.م.');
  });
});

describe('dates', () => {
  it('addMonths borne à la fin du mois et garde l’ancrage', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-01-31', 2, 31)).toBe('2026-03-31');
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
    expect(addMonths('2026-03-15', -4)).toBe('2025-11-15');
  });
  it('diffDays', () => {
    expect(diffDays('2026-02-01', '2026-03-01')).toBe(28);
    expect(diffDays('2026-03-01', '2026-02-01')).toBe(-28);
  });
});

describe('rentSchedule', () => {
  it('bail de 12 mois → 12 échéances mensuelles égales', () => {
    const s = rentSchedule({ startDate: '2026-01-01', endDate: '2026-12-31', periodAmountCents: 750000, frequency: 'monthly' });
    expect(s).toHaveLength(12);
    expect(s.every((i) => i.amountCents === 750000)).toBe(true);
    expect(s[0]).toMatchObject({ seq: 1, periodStart: '2026-01-01', periodEnd: '2026-01-31', dueDate: '2026-01-01' });
    expect(s[11]).toMatchObject({ periodStart: '2026-12-01', periodEnd: '2026-12-31' });
  });
  it('début au 31 : ancrage conservé (fév. → 28, mars → 31)', () => {
    const s = rentSchedule({ startDate: '2026-01-31', endDate: '2026-04-29', periodAmountCents: 1000, frequency: 'monthly' });
    expect(s.map((i) => i.periodStart)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
    expect(s[0]!.periodEnd).toBe('2026-02-27');
  });
  it('dernière période incomplète au prorata des jours', () => {
    const s = rentSchedule({ startDate: '2026-01-01', endDate: '2026-02-14', periodAmountCents: 280000, frequency: 'monthly' });
    expect(s).toHaveLength(2);
    expect(s[1]).toMatchObject({ periodStart: '2026-02-01', periodEnd: '2026-02-14', amountCents: 140000 }); // 14/28
  });
  it('trimestriel sur 2 ans → 8 échéances', () => {
    const s = rentSchedule({ startDate: '2026-03-10', endDate: '2028-03-09', periodAmountCents: 5400000, frequency: 'quarterly' });
    expect(s).toHaveLength(8);
    expect(s[7]!.periodEnd).toBe('2028-03-09');
  });
  it('échéance décalée (payable à terme échu)', () => {
    const s = rentSchedule({ startDate: '2026-01-01', endDate: '2026-01-31', periodAmountCents: 1, frequency: 'monthly', dueOffsetDays: 5 });
    expect(s[0]!.dueDate).toBe('2026-01-06');
  });
  it('refuse une fin avant le début', () => {
    expect(() => rentSchedule({ startDate: '2026-02-01', endDate: '2026-01-01', periodAmountCents: 1, frequency: 'monthly' })).toThrow();
  });
});

describe('saleSchedule', () => {
  it('avance + échéances : somme exacte du prix', () => {
    const s = saleSchedule({ totalCents: 480000001, downPaymentCents: 120000000, count: 6, firstDueDate: '2026-01-31', frequency: 'monthly' });
    expect(s).toHaveLength(7);
    expect(sum(s.map((i) => i.amountCents))).toBe(480000001);
    expect(s[0]!.amountCents).toBe(120000000);
    expect(s[1]!.dueDate).toBe('2026-02-28');
    expect(s[2]!.dueDate).toBe('2026-03-31');
  });
  it('sans avance', () => {
    const s = saleSchedule({ totalCents: 900, count: 3, firstDueDate: '2026-01-01', frequency: 'quarterly' });
    expect(s.map((i) => i.dueDate)).toEqual(['2026-01-01', '2026-04-01', '2026-07-01']);
  });
});

const inst = (id: string, dueDate: string, amountCents: number, paidCents = 0): InstallmentState => ({
  id, dueDate, amountCents, paidCents, status: paidCents === 0 ? 'pending' : paidCents >= amountCents ? 'paid' : 'partial',
});

describe('allocatePayment', () => {
  it('impute de la plus ancienne à la plus récente', () => {
    const r = allocatePayment(1000, [inst('b', '2026-02-01', 750), inst('a', '2026-01-01', 750)]);
    expect(r.allocations).toEqual([
      { installmentId: 'a', amountCents: 750, newPaidCents: 750, newStatus: 'paid' },
      { installmentId: 'b', amountCents: 250, newPaidCents: 250, newStatus: 'partial' },
    ]);
    expect(r.creditCents).toBe(0);
  });
  it('ignore les échéances soldées et retourne le trop-perçu', () => {
    const r = allocatePayment(1000, [inst('a', '2026-01-01', 750, 750), inst('b', '2026-02-01', 750, 500)]);
    expect(r.allocations).toHaveLength(1);
    expect(r.creditCents).toBe(750);
  });
  it('refuse un paiement nul ou non entier', () => {
    expect(() => allocatePayment(0, [])).toThrow();
    expect(() => allocatePayment(10.5, [])).toThrow();
  });
});

describe('retards et pénalités', () => {
  const rule = { rateBpPerMonth: 100, graceDays: 5 };
  it('pas de pénalité pendant le délai de grâce', () => {
    expect(latePenalty(inst('a', '2026-01-01', 750000), '2026-01-06', rule)).toBe(0);
  });
  it('1 %/mois au prorata des jours', () => {
    expect(latePenalty(inst('a', '2026-01-01', 750000), '2026-01-31', rule)).toBe(7500);
    expect(latePenalty(inst('a', '2026-01-01', 750000, 375000), '2026-01-16', rule)).toBe(1875);
  });
  it('isOverdue', () => {
    expect(isOverdue(inst('a', '2026-01-01', 10), '2026-01-01')).toBe(false);
    expect(isOverdue(inst('a', '2026-01-01', 10), '2026-01-02')).toBe(true);
    expect(isOverdue(inst('a', '2026-01-01', 10, 10), '2026-03-01')).toBe(false);
  });
});

describe('reschedule', () => {
  it('re-programme le reste dû sans changer le total', () => {
    const insts = [
      { ...inst('1', '2026-01-01', 1000, 1000), seq: 1 },
      { ...inst('2', '2026-02-01', 1000, 400), seq: 2 },
      { ...inst('3', '2026-03-01', 1000), seq: 3 },
    ];
    const r = reschedule({ installments: insts, count: 4, firstDueDate: '2026-04-15', frequency: 'monthly' });
    expect(r.totalRescheduledCents).toBe(1600);
    expect(r.close).toEqual([
      { id: '2', amountCents: 400, status: 'paid' },
      { id: '3', amountCents: 0, status: 'rescheduled' },
    ]);
    expect(r.create.map((c) => c.amountCents)).toEqual([400, 400, 400, 400]);
    expect(r.create.map((c) => c.seq)).toEqual([4, 5, 6, 7]);
    const before = sum(insts.map((i) => i.amountCents));
    const after = 1000 + sum(r.close.map((c) => c.amountCents)) + sum(r.create.map((c) => c.amountCents));
    expect(after).toBe(before);
    expect(outstanding({ amountCents: 400, paidCents: 400, status: 'paid' })).toBe(0);
  });
});

describe('comptabilité', () => {
  it('refuse une écriture déséquilibrée', () => {
    expect(() => assertBalanced([{ accountCode: '5141', debitCents: 100, creditCents: 0 }, { accountCode: '7127', debitCents: 0, creditCents: 90 }])).toThrow();
    expect(() => assertBalanced([{ accountCode: '5141', debitCents: 100, creditCents: 0 }, { accountCode: '7127', debitCents: 0, creditCents: 100 }])).not.toThrow();
  });
  it('compte de résultat CGNC (classe 7 − classe 6)', () => {
    const pnl = profitAndLoss([
      { accountCode: '5141', debitCents: 900000, creditCents: 0 },
      { accountCode: '7127', debitCents: 0, creditCents: 900000 },
      { accountCode: '6133', debitCents: 150000, creditCents: 0 },
      { accountCode: '5161', debitCents: 0, creditCents: 150000 },
    ]);
    expect(pnl).toMatchObject({ incomeCents: 900000, expenseCents: 150000, resultCents: 750000 });
    expect(pnl.byAccount).toEqual({ '7127': 900000, '6133': 150000 });
  });
});

describe('formatMoney (usage marocain)', () => {
  it('espace pour les milliers et virgule décimale en fr/ar', () => {
    expect(formatMoney(126900000, 'MAD', 'fr').replace(/[  ]/g, ' ')).toBe('1 269 000,00 MAD');
    expect(formatMoney(350000, 'MAD', 'ar').replace(/[  ]/g, ' ')).toBe('3 500,00 د.م.');
  });
});
