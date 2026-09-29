/**
 * Rôles et permissions. La vérification est toujours faite côté poste
 * principal (processus Electron / serveur de synchro), jamais seulement
 * dans l'interface.
 */
export const ROLES = ['admin', 'manager', 'sales', 'accountant', 'maintenance'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'dashboard.read',
  'properties.read',
  'properties.write',
  'persons.read',
  'persons.write',
  'leads.read',
  'leads.write',
  'contracts.read',
  'contracts.write',
  'reservations.write',
  'accounting.read',
  'accounting.write',
  'invoices.write',
  'maintenance.read',
  'maintenance.write',
  'appointments.write',
  'partners.write',
  'reports.read',
  'users.manage',
  'devices.manage',
  'settings.manage',
  'backup.manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL = new Set<Permission>(PERMISSIONS);

const MATRIX: Record<Role, ReadonlySet<Permission>> = {
  admin: ALL,
  manager: new Set(PERMISSIONS.filter((p) => !['users.manage', 'backup.manage', 'settings.manage'].includes(p))),
  sales: new Set<Permission>([
    'dashboard.read', 'properties.read', 'properties.write', 'persons.read', 'persons.write',
    'leads.read', 'leads.write', 'contracts.read', 'reservations.write', 'appointments.write',
    'maintenance.read',
  ]),
  accountant: new Set<Permission>([
    'dashboard.read', 'properties.read', 'persons.read', 'contracts.read', 'contracts.write',
    'accounting.read', 'accounting.write', 'invoices.write', 'reports.read',
  ]),
  maintenance: new Set<Permission>(['dashboard.read', 'properties.read', 'persons.read', 'maintenance.read', 'maintenance.write']),
};

export function isRole(r: unknown): r is Role {
  return typeof r === 'string' && (ROLES as readonly string[]).includes(r);
}

export function can(role: string | null | undefined, p: Permission): boolean {
  return isRole(role) && MATRIX[role].has(p);
}

/** Permission requise pour écrire dans une table (utilisée par la synchro). */
export const TABLE_WRITE_PERMISSION: Record<string, Permission> = {
  companies: 'settings.manage',
  branches: 'settings.manage',
  users: 'users.manage',
  audit_log: 'dashboard.read',
  media: 'properties.write',
  custom_field_defs: 'settings.manage',
  properties: 'properties.write',
  persons: 'persons.write',
  person_roles: 'persons.write',
  property_owners: 'properties.write',
  interactions: 'persons.write',
  pipeline_stages: 'settings.manage',
  leads: 'leads.write',
  lead_activities: 'leads.write',
  lead_matches: 'leads.write',
  contract_templates: 'settings.manage',
  contracts: 'contracts.write',
  contract_parties: 'contracts.write',
  installments: 'contracts.write',
  payments: 'accounting.write',
  payment_allocations: 'accounting.write',
  cheques: 'accounting.write',
  reservations: 'reservations.write',
  accounts: 'settings.manage',
  projects: 'properties.write',
  journal_entries: 'accounting.write',
  journal_lines: 'accounting.write',
  expense_categories: 'accounting.write',
  expenses: 'accounting.write',
  charge_invoices: 'invoices.write',
  charge_invoice_lines: 'invoices.write',
  maintenance_tickets: 'maintenance.write',
  ticket_events: 'maintenance.write',
  appointments: 'appointments.write',
  inquiries: 'appointments.write',
  project_ideas: 'appointments.write',
  partners: 'partners.write',
  partner_projects: 'partners.write',
  notification_rules: 'settings.manage',
  notifications: 'dashboard.read',
  outbox_messages: 'dashboard.read',
};

export function canWriteTable(role: string | null | undefined, table: string): boolean {
  const p = TABLE_WRITE_PERMISSION[table];
  return p !== undefined && can(role, p);
}
