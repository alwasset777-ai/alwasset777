import type { Kpis } from '../api/contract';
import type { SqlDriver } from '../db/driver';
import { addDays, type IsoDate } from '../finance/dates';

/** Indicateurs du tableau de bord, calculés en quelques requêtes SQL. */
export function computeKpis(db: SqlDriver, today: IsoDate): Kpis {
  const byStatusRows = db.all<{ status: string; n: number }>(
    `SELECT status, COUNT(*) AS n FROM properties
     WHERE deleted_at IS NULL AND type NOT IN ('tower', 'building')
     GROUP BY status`,
  );
  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const r of byStatusRows) {
    byStatus[r.status] = r.n;
    total += r.n;
  }
  // Occupation = biens loués / biens proposés à la location.
  const rentable = db.get<{ n: number; rented: number }>(
    `SELECT COUNT(*) AS n, SUM(CASE WHEN status = 'rented' THEN 1 ELSE 0 END) AS rented
     FROM properties WHERE deleted_at IS NULL AND purpose IN ('rent', 'both') AND type NOT IN ('tower', 'building')`,
  );
  const occupancyRateBp = rentable && rentable.n > 0 ? Math.round(((rentable.rented ?? 0) * 10000) / rentable.n) : 0;

  const activeContracts =
    db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM contracts WHERE deleted_at IS NULL AND status = 'active'`)?.n ?? 0;

  const open = `i.deleted_at IS NULL AND i.status IN ('pending', 'partial')
    AND c.deleted_at IS NULL AND c.status = 'active'`;
  const overdue = db.get<{ s: number | null; n: number }>(
    `SELECT SUM(i.amount_cents - i.paid_cents) AS s, COUNT(*) AS n
     FROM installments i JOIN contracts c ON c.id = i.contract_id
     WHERE ${open} AND i.due_date < ?`,
    [today],
  );
  const dueNext30 = db.get<{ s: number | null }>(
    `SELECT SUM(i.amount_cents - i.paid_cents) AS s
     FROM installments i JOIN contracts c ON c.id = i.contract_id
     WHERE ${open} AND i.due_date >= ? AND i.due_date <= ?`,
    [today, addDays(today, 30)],
  );
  const monthStart = `${today.slice(0, 7)}-01`;
  const collected = db.get<{ s: number | null }>(
    `SELECT SUM(amount_cents) AS s FROM payments WHERE deleted_at IS NULL AND paid_on >= ? AND paid_on <= ?`,
    [monthStart, today],
  );

  const upcoming = db.all<{ contractRef: string; personName: string; dueDate: string; outstandingCents: number }>(
    `SELECT c.reference AS contractRef,
            COALESCE(p.full_name_ar, p.full_name, '') AS personName,
            i.due_date AS dueDate,
            i.amount_cents - i.paid_cents AS outstandingCents
     FROM installments i
     JOIN contracts c ON c.id = i.contract_id
     LEFT JOIN contract_parties cp ON cp.contract_id = c.id AND cp.role IN ('tenant', 'buyer') AND cp.deleted_at IS NULL
     LEFT JOIN persons p ON p.id = cp.person_id
     WHERE ${open} AND i.due_date <= ?
     ORDER BY i.due_date
     LIMIT 10`,
    [addDays(today, 30)],
  );

  return {
    propertiesTotal: total,
    byStatus,
    occupancyRateBp,
    activeContracts,
    overdueCents: overdue?.s ?? 0,
    overdueCount: overdue?.n ?? 0,
    dueNext30Cents: dueNext30?.s ?? 0,
    collectedThisMonthCents: collected?.s ?? 0,
    upcoming,
  };
}
