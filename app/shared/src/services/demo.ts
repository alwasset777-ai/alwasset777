import { addDays, addMonths, type IsoDate } from '../finance/dates';
import { allocatePayment, type InstallmentState } from '../finance/installments';
import { rentSchedule, saleSchedule } from '../finance/schedule';
import { insert, update, type StoreContext } from '../db/store';

/**
 * Jeu de données de démonstration : 5 utilisateurs, 10 biens, 10 personnes,
 * 3 contrats (2 locations, 1 vente) avec échéanciers, paiements et écritures.
 * Les dates sont relatives à `today` pour que le tableau de bord montre
 * toujours des échéances à venir et des retards.
 */
export function seedDemo(
  ctx: StoreContext,
  opts: { hashPassword: (p: string) => string; initialPassword: string; today: IsoDate },
): void {
  const { today } = opts;
  const db = ctx.db;
  db.transaction(() => {
    // ── Utilisateurs (mot de passe provisoire = celui de l'admin, à changer)
    const hash = opts.hashPassword(opts.initialPassword);
    const users: [string, string, string][] = [
      ['manager', 'سعيد العلوي', 'manager'],
      ['commercial', 'نادية بنعلي', 'sales'],
      ['comptable', 'يوسف الإدريسي', 'accountant'],
      ['maintenance', 'حميد الصبار', 'maintenance'],
    ];
    const userIds: Record<string, string> = {};
    for (const [username, fullName, role] of users) {
      userIds[username] = insert(ctx, 'users', {
        username,
        full_name: fullName,
        role,
        language: 'ar',
        password_hash: hash,
        must_change_password: 1,
        active: 1,
      });
    }

    // ── Biens
    const P = (data: Record<string, string | number | null>) => insert(ctx, 'properties', data);
    const tower = P({ reference: 'WS-T01', title: 'برج الوسيط — المعاريف', type: 'tower', status: 'available', purpose: 'both', city: 'الدار البيضاء', district: 'المعاريف', area_m2: 5200, latitude: 33.5831, longitude: -7.6326, address: 'شارع الزرقطوني' });
    const apt1 = P({ reference: 'WS-A101', title: 'شقة 101 — برج الوسيط', type: 'apartment', parent_id: tower, status: 'rented', purpose: 'rent', city: 'الدار البيضاء', district: 'المعاريف', area_m2: 95, rooms: 3, bathrooms: 2, floor: 1, price_rent_cents: 750000 });
    const apt2 = P({ reference: 'WS-A102', title: 'شقة 102 — برج الوسيط', type: 'apartment', parent_id: tower, status: 'available', purpose: 'rent', city: 'الدار البيضاء', district: 'المعاريف', area_m2: 110, rooms: 3, bathrooms: 2, floor: 1, price_rent_cents: 850000 });
    const apt3 = P({ reference: 'WS-A201', title: 'شقة 201 — برج الوسيط', type: 'apartment', parent_id: tower, status: 'reserved', purpose: 'sale', city: 'الدار البيضاء', district: 'المعاريف', area_m2: 120, rooms: 4, bathrooms: 2, floor: 2, price_sale_cents: 185000000 });
    const villa = P({ reference: 'WS-V01', title: 'فيلا النخيل', type: 'villa', status: 'sold', purpose: 'sale', city: 'مراكش', district: 'النخيل', area_m2: 420, land_area_m2: 1200, rooms: 6, bathrooms: 4, price_sale_cents: 480000000, latitude: 31.6695, longitude: -7.9811 });
    const office = P({ reference: 'WS-B01', title: 'مكتب — حي الرياض', type: 'office', status: 'rented', purpose: 'rent', city: 'الرباط', district: 'حي الرياض', area_m2: 140, price_rent_cents: 1800000 });
    P({ reference: 'WS-C01', title: 'محل تجاري — شارع محمد الخامس', type: 'commercial', status: 'available', purpose: 'rent', city: 'طنجة', district: 'وسط المدينة', area_m2: 65, price_rent_cents: 1200000 });
    P({ reference: 'WS-M01', title: 'متجر — درب عمر', type: 'shop', status: 'maintenance', purpose: 'rent', city: 'الدار البيضاء', district: 'درب عمر', area_m2: 40, price_rent_cents: 900000 });
    P({ reference: 'WS-S01', title: 'صالة عرض — عين السبع', type: 'showroom', status: 'available', purpose: 'both', city: 'الدار البيضاء', district: 'عين السبع', area_m2: 380, price_rent_cents: 4500000, price_sale_cents: 950000000 });
    P({ reference: 'WS-L01', title: 'أرض — بوسكورة', type: 'land', status: 'available', purpose: 'sale', city: 'بوسكورة', land_area_m2: 2500, price_sale_cents: 375000000 });

    // ── Personnes
    const people: [name: string, nameFr: string, roles: string[], city: string, phone: string, kind?: string][] = [
      ['محمد بناني', 'Mohamed Bennani', ['owner'], 'الدار البيضاء', '+212661000001'],
      ['خديجة التازي', 'Khadija Tazi', ['tenant'], 'الدار البيضاء', '+212661000002'],
      ['شركة أطلس للاستشارات', 'Atlas Conseil SARL', ['tenant', 'company'], 'الرباط', '+212537000003', 'company'],
      ['كريم الفاسي', 'Karim El Fassi', ['buyer', 'investor'], 'مراكش', '+212661000004'],
      ['ليلى الشرقاوي', 'Leila Cherkaoui', ['seller', 'owner'], 'مراكش', '+212661000005'],
      ['عبد الله المنصوري', 'Abdellah Mansouri', ['buyer'], 'طنجة', '+212661000006'],
      ['مجموعة الأمل العقارية', 'Groupe Al Amal Immobilier', ['investor', 'company'], 'الدار البيضاء', '+212522000007', 'company'],
      ['رشيد الوزاني', 'Rachid Ouazzani', ['supplier'], 'الدار البيضاء', '+212661000008'],
      ['سناء بلحاج', 'Sanaa Belhaj', ['broker'], 'الرباط', '+212661000009'],
      ['أمين القادري', 'Amine Kadiri', ['tenant'], 'طنجة', '+212661000010'],
    ];
    const personIds = people.map(([name, nameFr, roles, city, phone, kind], i) => {
      const id = insert(ctx, 'persons', {
        kind: kind ?? 'individual',
        full_name: nameFr,
        full_name_ar: name,
        cin: kind ? null : `BE${String(100000 + i * 7919).slice(0, 6)}`,
        phone,
        whatsapp: phone,
        email: `${nameFr.toLowerCase().replace(/[^a-z]+/g, '.').replace(/\.+$/, '')}@example.ma`,
        city,
        nationality: 'MA',
      });
      for (const role of roles) insert(ctx, 'person_roles', { person_id: id, role });
      return id;
    });
    const [bennani, tazi, atlas, fassi, cherkaoui] = personIds as [string, string, string, string, string];
    insert(ctx, 'property_owners', { property_id: tower, person_id: bennani, share_bp: 10000 });
    insert(ctx, 'property_owners', { property_id: office, person_id: bennani, share_bp: 10000 });
    insert(ctx, 'property_owners', { property_id: villa, person_id: cherkaoui, share_bp: 10000 });

    // ── Contrat 1 : location appartement, commencé il y a 4 mois, 12 mois
    const c1Start = addMonths(today, -4);
    const c1 = createContract(ctx, {
      reference: 'CTR-2026-001', type: 'rent', property_id: apt1, start_date: c1Start,
      end_date: addDays(addMonths(c1Start, 12), -1), amount_cents: 750000, frequency: 'monthly',
      deposit_cents: 1500000, commission_cents: 750000, late_fee_bp: 100, grace_days: 5,
      parties: [[bennani, 'landlord'], [tazi, 'tenant']],
      schedule: rentSchedule({ startDate: c1Start, endDate: addDays(addMonths(c1Start, 12), -1), periodAmountCents: 750000, frequency: 'monthly' }),
    });
    // 2 mois et demi payés → un retard partiel apparaît au tableau de bord
    recordPayment(ctx, c1, tazi, apt1, addDays(c1Start, 2), 750000, 'transfer', 'REC-0001');
    recordPayment(ctx, c1, tazi, apt1, addDays(addMonths(c1Start, 1), 3), 750000, 'cash', 'REC-0002');
    recordPayment(ctx, c1, tazi, apt1, addDays(addMonths(c1Start, 2), 6), 400000, 'cheque', 'REC-0003');

    // ── Contrat 2 : location bureau, trimestriel, commencé il y a 2 mois
    const c2Start = addMonths(today, -2);
    const c2End = addDays(addMonths(c2Start, 24), -1);
    const c2 = createContract(ctx, {
      reference: 'CTR-2026-002', type: 'rent', property_id: office, start_date: c2Start, end_date: c2End,
      amount_cents: 1800000, frequency: 'quarterly', deposit_cents: 3600000, commission_cents: 1800000,
      late_fee_bp: 150, grace_days: 10, parties: [[bennani, 'landlord'], [atlas, 'tenant']],
      schedule: rentSchedule({ startDate: c2Start, endDate: c2End, periodAmountCents: 1800000 * 3, frequency: 'quarterly' }),
    });
    recordPayment(ctx, c2, atlas, office, addDays(c2Start, 1), 5400000, 'transfer', 'REC-0004');

    // ── Contrat 3 : vente villa avec avance + 6 échéances mensuelles
    const c3Start = addMonths(today, -3);
    const c3 = createContract(ctx, {
      reference: 'CTR-2026-003', type: 'sale', property_id: villa, start_date: c3Start, end_date: null,
      amount_cents: 480000000, frequency: 'monthly', deposit_cents: 0, commission_cents: 12000000,
      late_fee_bp: 0, grace_days: 0, parties: [[cherkaoui, 'seller'], [fassi, 'buyer']],
      schedule: saleSchedule({ totalCents: 480000000, downPaymentCents: 120000000, count: 6, firstDueDate: c3Start, frequency: 'monthly' }),
    });
    recordPayment(ctx, c3, fassi, villa, c3Start, 120000000, 'transfer', 'REC-0005');
    recordPayment(ctx, c3, fassi, villa, addMonths(c3Start, 1), 60000000, 'cheque', 'REC-0006');

    // ── Réservation, ticket de maintenance, rendez-vous
    insert(ctx, 'reservations', { property_id: apt3, person_id: personIds[5]!, starts_on: today, ends_on: addDays(today, 7), deposit_cents: 2000000, status: 'active' });
    insert(ctx, 'maintenance_tickets', { number: 'MNT-0001', property_id: apt1, reported_by_person_id: tazi, category: 'plumbing', priority: 'high', title: 'تسرب مياه في الحمام', status: 'open', assigned_to: userIds.maintenance ?? null, due_at: addDays(today, 2) });
    insert(ctx, 'appointments', { property_id: apt2, visitor_name: 'عبد الله المنصوري', visitor_phone: '+212661000006', starts_at: `${addDays(today, 1)}T10:00:00.000Z`, agent_id: userIds.commercial ?? null, status: 'scheduled' });
  });
}

interface ContractSeed {
  reference: string;
  type: string;
  property_id: string;
  start_date: string;
  end_date: string | null;
  amount_cents: number;
  frequency: string;
  deposit_cents: number;
  commission_cents: number;
  late_fee_bp: number;
  grace_days: number;
  parties: [personId: string, role: string][];
  schedule: { seq: number; periodStart: string; periodEnd: string; dueDate: string; amountCents: number }[];
}

function createContract(ctx: StoreContext, c: ContractSeed): string {
  const { parties, schedule, ...fields } = c;
  const id = insert(ctx, 'contracts', { ...fields, status: 'active', signed_on: c.start_date });
  for (const [person_id, role] of parties) insert(ctx, 'contract_parties', { contract_id: id, person_id, role });
  for (const s of schedule) {
    insert(ctx, 'installments', {
      contract_id: id, seq: s.seq, due_date: s.dueDate, period_start: s.periodStart, period_end: s.periodEnd,
      amount_cents: s.amountCents, paid_cents: 0, status: 'pending',
    });
  }
  return id;
}

/** Enregistre un paiement, l'impute sur les échéances et passe l'écriture comptable. */
export function recordPayment(
  ctx: StoreContext,
  contractId: string,
  personId: string,
  propertyId: string,
  paidOn: string,
  amountCents: number,
  method: 'cash' | 'transfer' | 'cheque' | 'card',
  receiptNumber: string,
): string {
  const db = ctx.db;
  return db.transaction(() => {
    const insts = db.all<{ id: string; due_date: string; amount_cents: number; paid_cents: number; status: string }>(
      'SELECT id, due_date, amount_cents, paid_cents, status FROM installments WHERE contract_id = ? AND deleted_at IS NULL',
      [contractId],
    );
    const state: InstallmentState[] = insts.map((i) => ({
      id: i.id, dueDate: i.due_date, amountCents: i.amount_cents, paidCents: i.paid_cents,
      status: i.status as InstallmentState['status'],
    }));
    const { allocations } = allocatePayment(amountCents, state);
    const paymentId = insert(ctx, 'payments', {
      person_id: personId, contract_id: contractId, paid_on: paidOn, amount_cents: amountCents,
      method, receipt_number: receiptNumber,
    });
    for (const a of allocations) {
      insert(ctx, 'payment_allocations', { payment_id: paymentId, installment_id: a.installmentId, amount_cents: a.amountCents });
      update(ctx, 'installments', a.installmentId, { paid_cents: a.newPaidCents, status: a.newStatus });
    }
    const type = db.get<{ type: string }>('SELECT type FROM contracts WHERE id = ?', [contractId])?.type;
    const entry = insert(ctx, 'journal_entries', {
      entry_date: paidOn, number: receiptNumber, label: `Encaissement ${receiptNumber}`, source: 'payment', source_id: paymentId,
    });
    const cash = method === 'cash' ? '5161' : '5141';
    // Bien d'un mandant (ou lot d'un immeuble d'un mandant) : les fonds lui sont dus (compte de tiers), seule la
    // commission est un produit de l'agence. Bien propre : produit direct.
    const managed = db.get(
      `SELECT 1 FROM property_owners
       WHERE deleted_at IS NULL
         AND property_id IN (SELECT id FROM properties WHERE id = ? UNION SELECT parent_id FROM properties WHERE id = ?)
       LIMIT 1`,
      [propertyId, propertyId],
    );
    const income = managed ? '4487' : type === 'sale' ? '7122' : '7127';
    insert(ctx, 'journal_lines', { entry_id: entry, account_code: cash, debit_cents: amountCents, credit_cents: 0, property_id: propertyId });
    insert(ctx, 'journal_lines', { entry_id: entry, account_code: income, debit_cents: 0, credit_cents: amountCents, property_id: propertyId });
    return paymentId;
  });
}

