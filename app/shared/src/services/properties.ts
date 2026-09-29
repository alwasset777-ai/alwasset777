import type { PropertyFilters, PropertyListItem } from '../api/contract';
import type { SqlDriver, SqlValue } from '../db/driver';

/** Liste filtrée des biens (la recherche avancée complète arrive avec M1). */
export function listProperties(db: SqlDriver, f: PropertyFilters = {}): PropertyListItem[] {
  const where = ['p.deleted_at IS NULL'];
  const params: SqlValue[] = [];
  if (f.status) {
    where.push('p.status = ?');
    params.push(f.status);
  }
  if (f.type) {
    where.push('p.type = ?');
    params.push(f.type);
  }
  if (f.city) {
    where.push('p.city = ?');
    params.push(f.city);
  }
  if (f.q?.trim()) {
    const like = `%${f.q.trim().replace(/[%_]/g, (m) => `\\${m}`)}%`;
    where.push(`(p.title LIKE ? ESCAPE '\\' OR p.reference LIKE ? ESCAPE '\\' OR p.city LIKE ? ESCAPE '\\' OR p.district LIKE ? ESCAPE '\\')`);
    params.push(like, like, like, like);
  }
  return db.all<PropertyListItem>(
    `SELECT p.id, p.reference, p.title, p.type, p.status, p.city, p.district,
            p.area_m2 AS areaM2, p.price_sale_cents AS priceSaleCents, p.price_rent_cents AS priceRentCents,
            parent.title AS parentTitle
     FROM properties p LEFT JOIN properties parent ON parent.id = p.parent_id
     WHERE ${where.join(' AND ')}
     ORDER BY COALESCE(p.parent_id, p.id), p.parent_id IS NOT NULL, p.reference
     LIMIT 1000`,
    params,
  );
}
