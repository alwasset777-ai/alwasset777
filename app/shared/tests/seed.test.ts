import { describe, expect, it } from 'vitest';
import { computeKpis } from '../src/services/dashboard';
import { listProperties } from '../src/services/properties';
import { needsSetup, setupAgency } from '../src/services/setup';
import { listUsers } from '../src/services/users';
import { profitAndLoss } from '../src/finance/ledger';
import { context, fakeHash } from './helpers';

const TODAY = '2026-09-28';

function seeded() {
  const ctx = context('hub');
  setupAgency(
    ctx,
    { agencyName: 'الوسيط 777', city: 'الدار البيضاء', adminFullName: 'منير', adminUsername: 'admin', adminPassword: 'motdepasse1', language: 'ar', withDemoData: true },
    fakeHash,
    TODAY,
  );
  return ctx;
}

describe('setup + données de démo', () => {
  it('crée la société, les utilisateurs et le jeu de démo attendu', () => {
    const ctx = seeded();
    expect(needsSetup(ctx)).toBe(false);
    const count = (t: string) => ctx.db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${t}`)!.n;
    expect(count('properties')).toBe(10);
    expect(count('persons')).toBe(10);
    expect(count('contracts')).toBe(3);
    expect(listUsers(ctx.db)).toHaveLength(5);
    expect(listProperties(ctx.db, { q: 'برج' }).length).toBeGreaterThanOrEqual(1);
    expect(listProperties(ctx.db, { status: 'rented' })).toHaveLength(2);
  });

  it('refuse un second setup et un mot de passe trop court', () => {
    const ctx = seeded();
    expect(() => setupAgency(ctx, { agencyName: 'x', city: '', adminFullName: 'x', adminUsername: 'adm', adminPassword: '12345678', language: 'fr', withDemoData: false }, fakeHash, TODAY)).toThrow();
    const fresh = context('hub2');
    expect(() => setupAgency(fresh, { agencyName: 'x', city: '', adminFullName: 'x', adminUsername: 'adm', adminPassword: 'court', language: 'fr', withDemoData: false }, fakeHash, TODAY)).toThrow();
  });

  it('paiements imputés et écritures équilibrées', () => {
    const ctx = seeded();
    const paid = ctx.db.get<{ p: number; a: number }>(
      'SELECT (SELECT SUM(amount_cents) FROM payments) AS p, (SELECT SUM(paid_cents) FROM installments) AS a',
    )!;
    expect(paid.a).toBe(paid.p);
    const bal = ctx.db.get<{ d: number; c: number }>('SELECT SUM(debit_cents) AS d, SUM(credit_cents) AS c FROM journal_lines')!;
    expect(bal.d).toBe(bal.c);
    // Biens de mandants : aucun produit pour l'agence sur les loyers encaissés.
    const lines = ctx.db.all<{ accountCode: string; debitCents: number; creditCents: number }>(
      'SELECT account_code AS accountCode, debit_cents AS debitCents, credit_cents AS creditCents FROM journal_lines',
    );
    expect(profitAndLoss(lines).incomeCents).toBe(0);
  });

  it('tableau de bord cohérent', () => {
    const k = computeKpis(seeded().db, TODAY);
    expect(k.propertiesTotal).toBe(9); // la tour n'est pas comptée comme bien
    expect(k.activeContracts).toBe(3);
    expect(k.overdueCount).toBeGreaterThan(0);
    expect(k.overdueCents).toBeGreaterThan(0);
    expect(k.occupancyRateBp).toBeGreaterThan(0);
    expect(k.upcoming.length).toBeGreaterThan(0);
  });
});
