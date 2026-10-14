import type { Cents } from './money';

export interface LedgerLine {
  accountCode: string;
  debitCents: Cents;
  creditCents: Cents;
}

/** Une écriture en partie double doit être équilibrée et non vide. */
export function assertBalanced(lines: LedgerLine[]): void {
  if (lines.length < 2) throw new Error('Une écriture comporte au moins deux lignes');
  let d = 0;
  let c = 0;
  for (const l of lines) {
    if (l.debitCents < 0 || l.creditCents < 0) throw new Error('Montants négatifs interdits');
    if (l.debitCents > 0 && l.creditCents > 0) throw new Error('Une ligne est soit au débit, soit au crédit');
    d += l.debitCents;
    c += l.creditCents;
  }
  if (d !== c) throw new Error(`Écriture déséquilibrée : débit ${d} ≠ crédit ${c}`);
  if (d === 0) throw new Error('Écriture de montant nul');
}

export interface ProfitAndLoss {
  incomeCents: Cents;
  expenseCents: Cents;
  resultCents: Cents;
  byAccount: Record<string, Cents>;
}

/**
 * Compte de résultat selon le CGNC : classe 7 = produits (solde créditeur),
 * classe 6 = charges (solde débiteur). Les autres classes sont ignorées.
 */
export function profitAndLoss(lines: LedgerLine[]): ProfitAndLoss {
  let income = 0;
  let expense = 0;
  const byAccount: Record<string, Cents> = {};
  for (const l of lines) {
    const cls = l.accountCode[0];
    if (cls === '7') {
      const v = l.creditCents - l.debitCents;
      income += v;
      byAccount[l.accountCode] = (byAccount[l.accountCode] ?? 0) + v;
    } else if (cls === '6') {
      const v = l.debitCents - l.creditCents;
      expense += v;
      byAccount[l.accountCode] = (byAccount[l.accountCode] ?? 0) + v;
    }
  }
  return { incomeCents: income, expenseCents: expense, resultCents: income - expense, byAccount };
}
