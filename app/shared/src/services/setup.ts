import type { SetupInput } from '../api/contract';
import { getSetting, setSetting } from '../db/migrate';
import { insert, type StoreContext } from '../db/store';
import { seedDemo } from './demo';

/** Plan comptable de départ (CGNC simplifié) — à valider par l'expert-comptable. */
export const DEFAULT_ACCOUNTS: [code: string, fr: string, ar: string, cls: number, kind: string][] = [
  ['1111', 'Capital social', 'رأس المال الاجتماعي', 1, 'equity'],
  ['3421', 'Clients', 'الزبناء', 3, 'asset'],
  ['3455', 'État — TVA récupérable', 'الدولة - الضريبة على القيمة المضافة القابلة للاسترجاع', 3, 'asset'],
  ['4411', 'Fournisseurs', 'المورِّدون', 4, 'liability'],
  ['4425', 'Dépôts de garantie reçus', 'ودائع الضمان المستلمة', 4, 'liability'],
  ['4487', 'Fonds reçus pour le compte des mandants', 'أموال مستلمة لحساب الموكلين', 4, 'liability'],
  ['4455', 'État — TVA facturée', 'الدولة - الضريبة على القيمة المضافة المفوترة', 4, 'liability'],
  ['5141', 'Banques', 'البنوك', 5, 'asset'],
  ['5161', 'Caisse', 'الصندوق', 5, 'asset'],
  ['6125', 'Achats non stockés (eau, électricité)', 'مشتريات غير مخزنة (ماء، كهرباء)', 6, 'expense'],
  ['6131', 'Locations et charges locatives', 'الأكرية والتكاليف الكرائية', 6, 'expense'],
  ['6133', 'Entretien et réparations', 'الصيانة والإصلاحات', 6, 'expense'],
  ['6144', 'Publicité et annonces', 'الإشهار والإعلانات', 6, 'expense'],
  ['6167', 'Impôts et taxes', 'الضرائب والرسوم', 6, 'expense'],
  ['6171', 'Rémunérations du personnel', 'أجور المستخدمين', 6, 'expense'],
  ['7121', 'Commissions et honoraires', 'العمولات والأتعاب', 7, 'income'],
  ['7122', 'Ventes de biens immobiliers', 'مبيعات العقارات', 7, 'income'],
  ['7127', 'Loyers et charges refacturées', 'الأكرية والتكاليف المعاد فوترتها', 7, 'income'],
];

const STAGES: [ar: string, fr: string, en: string, won?: 1, lost?: 1][] = [
  ['جديد', 'Nouveau', 'New'],
  ['تم التواصل', 'Contacté', 'Contacted'],
  ['زيارة', 'Visite', 'Visit'],
  ['عرض', 'Offre', 'Offer'],
  ['تفاوض', 'Négociation', 'Negotiation'],
  ['تمت الصفقة', 'Conclu', 'Won', 1],
  ['ضائع', 'Perdu', 'Lost', undefined, 1],
];

const EXPENSE_CATEGORIES: [ar: string, fr: string, code: string][] = [
  ['ماء وكهرباء', 'Eau & électricité', '6125'],
  ['صيانة وإصلاحات', 'Entretien & réparations', '6133'],
  ['إشهار', 'Publicité', '6144'],
  ['ضرائب', 'Impôts & taxes', '6167'],
  ['أجور', 'Salaires', '6171'],
  ['كراء المكتب', 'Loyer du bureau', '6131'],
];

const NOTIFICATION_RULES: [event: string, days: number, channels: string[]][] = [
  ['installment_due', 3, ['app', 'sound', 'whatsapp']],
  ['installment_overdue', 1, ['app', 'sound', 'sms']],
  ['cheque_due', 2, ['app', 'sound']],
  ['appointment', 1, ['app', 'sound', 'whatsapp']],
  ['document_expiry', 30, ['app', 'email']],
  ['contract_end', 60, ['app', 'email']],
];

export function needsSetup(ctx: StoreContext): boolean {
  return getSetting(ctx.db, 'company_id') === undefined;
}

export interface SetupResult {
  companyId: string;
  branchId: string;
  adminId: string;
}

/**
 * Crée la société, la succursale principale, l'administrateur et les
 * référentiels (plan comptable, étapes du pipeline, règles d'alerte).
 */
export function setupAgency(
  ctx: StoreContext,
  input: SetupInput,
  hashPassword: (pwd: string) => string,
  today: string,
): SetupResult {
  if (!needsSetup(ctx)) throw new Error("L'agence est déjà configurée");
  if (input.adminPassword.length < 8) throw new Error('Mot de passe trop court (8 caractères minimum)');
  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(input.adminUsername)) throw new Error("Nom d'utilisateur invalide");

  return ctx.db.transaction(() => {
    const companyId = insert(ctx, 'companies', {
      name: input.agencyName,
      name_ar: input.agencyName,
      city: input.city,
      currency: 'MAD',
      vat_rate_bp: 2000,
    });
    const scoped: StoreContext = { ...ctx, companyId };
    const branchId = insert(scoped, 'branches', { name: input.city || input.agencyName, city: input.city });
    const s: StoreContext = { ...scoped, branchId };
    const adminId = insert(s, 'users', {
      username: input.adminUsername,
      full_name: input.adminFullName,
      role: 'admin',
      language: input.language,
      password_hash: hashPassword(input.adminPassword),
      must_change_password: 0,
      active: 1,
    });
    const withUser: StoreContext = { ...s, userId: adminId };

    for (const [code, fr, ar, cls, kind] of DEFAULT_ACCOUNTS) {
      insert(withUser, 'accounts', { code, name_fr: fr, name_ar: ar, class: cls, kind });
    }
    STAGES.forEach(([ar, fr, en, won, lost], i) =>
      insert(withUser, 'pipeline_stages', { name_ar: ar, name_fr: fr, name_en: en, sort_order: i, is_won: won ?? 0, is_lost: lost ?? 0 }),
    );
    for (const [ar, fr, code] of EXPENSE_CATEGORIES) {
      insert(withUser, 'expense_categories', { name_ar: ar, name_fr: fr, account_code: code });
    }
    for (const [event, days, channels] of NOTIFICATION_RULES) {
      insert(withUser, 'notification_rules', { event, days_before: days, channels: JSON.stringify(channels), enabled: 1 });
    }

    setSetting(ctx.db, 'company_id', companyId);
    setSetting(ctx.db, 'branch_id', branchId);
    if (input.withDemoData) {
      seedDemo(withUser, { hashPassword, initialPassword: input.adminPassword, today });
      setSetting(ctx.db, 'demo_data', '1');
    }
    return { companyId, branchId, adminId };
  });
}
