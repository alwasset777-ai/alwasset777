/**
 * Migration 0001 — schéma complet (modules M1 → M12).
 *
 * Conventions :
 *  - `id TEXT PRIMARY KEY` (UUIDv7) sur toutes les tables synchronisées ;
 *  - colonnes communes : company_id, branch_id, created_at, updated_at,
 *    updated_by, deleted_at (suppression douce, indispensable à la synchro) ;
 *  - montants en centimes (INTEGER) + devise ISO (MAD par défaut) ;
 *  - dates « métier » en 'YYYY-MM-DD', horodatages en ISO 8601.
 *
 * Les colonnes « métier » sont nullables ou ont une valeur par défaut :
 * la synchronisation champ par champ peut ainsi appliquer des changements
 * partiels sans violer de contrainte.
 */
const common = `
  company_id TEXT,
  branch_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_by TEXT,
  deleted_at TEXT`;

export const migration0001 = `
-- ───────────── Tables techniques (non synchronisées) ─────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE change_log (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  tbl TEXT NOT NULL,
  row_id TEXT NOT NULL,
  col TEXT NOT NULL,
  value TEXT,            -- valeur encodée en JSON
  hlc TEXT NOT NULL,
  device_id TEXT NOT NULL
);
CREATE INDEX idx_change_log_device ON change_log(device_id, seq);

CREATE TABLE sync_field_clock (
  tbl TEXT NOT NULL,
  row_id TEXT NOT NULL,
  col TEXT NOT NULL,
  hlc TEXT NOT NULL,
  PRIMARY KEY (tbl, row_id, col)
) WITHOUT ROWID;

CREATE TABLE sync_inbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payload TEXT NOT NULL,
  error TEXT,
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT,
  user_id TEXT,
  secret_hash TEXT NOT NULL,
  paired_at TEXT NOT NULL,
  last_seen_at TEXT,
  last_ip TEXT,
  revoked_at TEXT
);

-- ───────────── Organisation & sécurité ─────────────
CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  name TEXT,
  name_ar TEXT,
  legal_form TEXT,
  ice TEXT,              -- Identifiant Commun de l'Entreprise
  rc TEXT,               -- Registre du commerce
  if_number TEXT,        -- Identifiant fiscal
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  currency TEXT NOT NULL DEFAULT 'MAD',
  vat_rate_bp INTEGER NOT NULL DEFAULT 2000,   -- 20,00 % en points de base
  logo_media_id TEXT,
  ${common}
);

CREATE TABLE branches (
  id TEXT PRIMARY KEY,
  name TEXT,
  city TEXT,
  address TEXT,
  phone TEXT,
  ${common}
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'sales',   -- admin | manager | sales | accountant | maintenance
  language TEXT NOT NULL DEFAULT 'ar',
  password_hash TEXT,                   -- jamais synchronisé vers les mobiles
  must_change_password INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  ${common}
);
CREATE UNIQUE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT,
  entity TEXT,
  entity_id TEXT,
  details TEXT,
  ${common}
);

-- ───────────── Médias & documents (communs à tous les modules) ─────────────
CREATE TABLE media (
  id TEXT PRIMARY KEY,
  entity TEXT,           -- 'properties', 'persons', 'contracts'…
  entity_id TEXT,
  kind TEXT,             -- photo | video | document
  title TEXT,
  mime TEXT,
  size_bytes INTEGER,
  sha256 TEXT,           -- stockage adressé par contenu sur le disque
  thumb_sha256 TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  expires_on TEXT,       -- expiration de document (CIN, assurance…)
  ${common}
);
CREATE INDEX idx_media_entity ON media(entity, entity_id);

CREATE TABLE custom_field_defs (
  id TEXT PRIMARY KEY,
  entity TEXT,
  key TEXT,
  label_ar TEXT,
  label_fr TEXT,
  label_en TEXT,
  field_type TEXT,       -- text | number | boolean | date | select
  options_json TEXT,
  ${common}
);

-- ───────────── M1 — Biens immobiliers ─────────────
CREATE TABLE properties (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES properties(id),
  reference TEXT,
  title TEXT,
  type TEXT,             -- tower | building | apartment | villa | office | commercial | shop | showroom | land | other
  status TEXT NOT NULL DEFAULT 'available',  -- available | reserved | rented | sold | maintenance
  purpose TEXT,          -- rent | sale | both
  price_sale_cents INTEGER,
  price_rent_cents INTEGER,
  currency TEXT NOT NULL DEFAULT 'MAD',
  area_m2 REAL,
  land_area_m2 REAL,
  rooms INTEGER,
  bathrooms INTEGER,
  floor INTEGER,
  year_built INTEGER,
  address TEXT,
  city TEXT,
  district TEXT,
  latitude REAL,
  longitude REAL,
  title_deed TEXT,       -- n° titre foncier
  description TEXT,
  attributes_json TEXT,
  project_id TEXT,
  ${common}
);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_city ON properties(city);
CREATE INDEX idx_properties_parent ON properties(parent_id);

-- ───────────── M2 — Personnes ─────────────
CREATE TABLE persons (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'individual',   -- individual | company
  full_name TEXT,
  full_name_ar TEXT,
  cin TEXT,
  passport TEXT,
  ice TEXT,
  rc TEXT,
  phone TEXT,
  phone2 TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  nationality TEXT,
  birth_date TEXT,
  notes TEXT,
  ${common}
);
CREATE INDEX idx_persons_phone ON persons(phone);

CREATE TABLE person_roles (
  id TEXT PRIMARY KEY,
  person_id TEXT REFERENCES persons(id),
  role TEXT,             -- tenant | owner | seller | buyer | investor | company | supplier | broker
  ${common}
);
CREATE INDEX idx_person_roles_person ON person_roles(person_id);

CREATE TABLE property_owners (
  id TEXT PRIMARY KEY,
  property_id TEXT REFERENCES properties(id),
  person_id TEXT REFERENCES persons(id),
  share_bp INTEGER NOT NULL DEFAULT 10000,   -- quote-part en points de base
  ${common}
);

CREATE TABLE interactions (
  id TEXT PRIMARY KEY,
  person_id TEXT REFERENCES persons(id),
  property_id TEXT,
  user_id TEXT,
  channel TEXT,          -- call | visit | whatsapp | email | sms | meeting
  direction TEXT,        -- in | out
  summary TEXT,
  occurred_at TEXT,
  ${common}
);

-- ───────────── M3 — Prospects ─────────────
CREATE TABLE pipeline_stages (
  id TEXT PRIMARY KEY,
  name_ar TEXT,
  name_fr TEXT,
  name_en TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_won INTEGER NOT NULL DEFAULT 0,
  is_lost INTEGER NOT NULL DEFAULT 0,
  ${common}
);

CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  person_id TEXT REFERENCES persons(id),
  assigned_to TEXT,
  stage_id TEXT,
  source TEXT,           -- walk_in | phone | whatsapp | website | avito | facebook | referral
  intent TEXT,           -- rent | buy | invest
  budget_min_cents INTEGER,
  budget_max_cents INTEGER,
  criteria_json TEXT,    -- types, villes, surface min/max, pièces…
  probability INTEGER,
  closed_at TEXT,
  outcome TEXT,
  notes TEXT,
  ${common}
);

CREATE TABLE lead_activities (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id),
  user_id TEXT,
  kind TEXT,             -- note | call | visit | offer | stage_change
  content TEXT,
  due_at TEXT,
  done_at TEXT,
  ${common}
);

CREATE TABLE lead_matches (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id),
  property_id TEXT REFERENCES properties(id),
  score INTEGER,
  status TEXT,           -- suggested | sent | visited | rejected
  ${common}
);

-- ───────────── M4 — Contrats ─────────────
CREATE TABLE contract_templates (
  id TEXT PRIMARY KEY,
  type TEXT,             -- rent | sale | purchase | brokerage
  language TEXT,
  name TEXT,
  body_html TEXT,        -- variables {{tenant.full_name}}, {{contract.amount}}…
  is_default INTEGER NOT NULL DEFAULT 0,
  ${common}
);

CREATE TABLE contracts (
  id TEXT PRIMARY KEY,
  reference TEXT,
  type TEXT,             -- rent | sale | purchase | brokerage
  status TEXT NOT NULL DEFAULT 'draft',   -- draft | active | renewed | terminated | completed
  property_id TEXT REFERENCES properties(id),
  template_id TEXT,
  start_date TEXT,
  end_date TEXT,
  amount_cents INTEGER,          -- loyer périodique ou prix total
  currency TEXT NOT NULL DEFAULT 'MAD',
  frequency TEXT,                -- monthly | quarterly | semiannual | annual | once
  deposit_cents INTEGER,
  commission_cents INTEGER,
  late_fee_bp INTEGER,           -- pénalité de retard (points de base / mois)
  grace_days INTEGER,
  signed_on TEXT,
  terminated_on TEXT,
  termination_reason TEXT,
  renewed_from_id TEXT,
  notes TEXT,
  ${common}
);
CREATE INDEX idx_contracts_property ON contracts(property_id);

CREATE TABLE contract_parties (
  id TEXT PRIMARY KEY,
  contract_id TEXT REFERENCES contracts(id),
  person_id TEXT REFERENCES persons(id),
  role TEXT,             -- landlord | tenant | seller | buyer | guarantor | broker
  ${common}
);
CREATE INDEX idx_contract_parties_contract ON contract_parties(contract_id);

CREATE TABLE installments (
  id TEXT PRIMARY KEY,
  contract_id TEXT REFERENCES contracts(id),
  seq INTEGER,
  label TEXT,
  due_date TEXT,
  period_start TEXT,
  period_end TEXT,
  amount_cents INTEGER,
  paid_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | partial | paid | cancelled | rescheduled
  rescheduled_from_id TEXT,
  ${common}
);
CREATE INDEX idx_installments_due ON installments(due_date, status);
CREATE INDEX idx_installments_contract ON installments(contract_id);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  person_id TEXT REFERENCES persons(id),
  contract_id TEXT,
  paid_on TEXT,
  amount_cents INTEGER,
  currency TEXT NOT NULL DEFAULT 'MAD',
  method TEXT,           -- cash | transfer | cheque | card
  reference TEXT,
  cheque_id TEXT,
  receipt_number TEXT,
  notes TEXT,
  ${common}
);

CREATE TABLE payment_allocations (
  id TEXT PRIMARY KEY,
  payment_id TEXT REFERENCES payments(id),
  installment_id TEXT,
  charge_invoice_id TEXT,
  amount_cents INTEGER,
  ${common}
);

CREATE TABLE cheques (
  id TEXT PRIMARY KEY,
  person_id TEXT REFERENCES persons(id),
  number TEXT,
  bank TEXT,
  amount_cents INTEGER,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'in_hand',   -- in_hand | deposited | cashed | bounced | returned
  ${common}
);
CREATE INDEX idx_cheques_due ON cheques(due_date, status);

-- ───────────── M5 — Réservations ─────────────
CREATE TABLE reservations (
  id TEXT PRIMARY KEY,
  property_id TEXT REFERENCES properties(id),
  person_id TEXT REFERENCES persons(id),
  starts_on TEXT,
  ends_on TEXT,
  deposit_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'active',    -- active | expired | converted | cancelled
  contract_id TEXT,
  notes TEXT,
  ${common}
);

-- ───────────── M6 — Dépenses & comptabilité (CGNC) ─────────────
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  code TEXT,             -- ex. 5141 Banques, 7127 Loyers, 6125 Achats non stockés
  name_ar TEXT,
  name_fr TEXT,
  class INTEGER,         -- classe CGNC 1 à 7
  kind TEXT,             -- asset | liability | equity | income | expense
  ${common}
);
CREATE UNIQUE INDEX idx_accounts_code ON accounts(code) WHERE deleted_at IS NULL;

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT,
  city TEXT,
  description TEXT,
  status TEXT,
  ${common}
);

CREATE TABLE journal_entries (
  id TEXT PRIMARY KEY,
  entry_date TEXT,
  number TEXT,
  label TEXT,
  source TEXT,           -- payment | expense | invoice | manual
  source_id TEXT,
  ${common}
);

CREATE TABLE journal_lines (
  id TEXT PRIMARY KEY,
  entry_id TEXT REFERENCES journal_entries(id),
  account_code TEXT,
  debit_cents INTEGER NOT NULL DEFAULT 0,
  credit_cents INTEGER NOT NULL DEFAULT 0,
  property_id TEXT,      -- axes analytiques → P&L par bien / projet / succursale
  project_id TEXT,
  label TEXT,
  ${common}
);
CREATE INDEX idx_journal_lines_entry ON journal_lines(entry_id);
CREATE INDEX idx_journal_lines_property ON journal_lines(property_id);

CREATE TABLE expense_categories (
  id TEXT PRIMARY KEY,
  name_ar TEXT,
  name_fr TEXT,
  account_code TEXT,
  ${common}
);

CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  category_id TEXT,
  property_id TEXT,
  project_id TEXT,
  supplier_id TEXT,
  spent_on TEXT,
  amount_cents INTEGER,
  vat_cents INTEGER NOT NULL DEFAULT 0,
  method TEXT,
  voucher_number TEXT,
  description TEXT,
  ${common}
);

-- ───────────── M7 — Facturation des charges ─────────────
CREATE TABLE charge_invoices (
  id TEXT PRIMARY KEY,
  number TEXT,
  property_id TEXT,
  person_id TEXT,
  contract_id TEXT,
  period_start TEXT,
  period_end TEXT,
  issued_on TEXT,
  due_date TEXT,
  total_cents INTEGER,
  paid_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'issued',    -- draft | issued | partial | paid | cancelled
  ${common}
);

CREATE TABLE charge_invoice_lines (
  id TEXT PRIMARY KEY,
  invoice_id TEXT REFERENCES charge_invoices(id),
  kind TEXT,             -- electricity | water | air_conditioning | maintenance | syndic | other
  label TEXT,
  quantity REAL,
  unit_price_cents INTEGER,
  amount_cents INTEGER,
  ${common}
);

-- ───────────── M8 — Maintenance ─────────────
CREATE TABLE maintenance_tickets (
  id TEXT PRIMARY KEY,
  number TEXT,
  property_id TEXT,
  reported_by_person_id TEXT,
  category TEXT,         -- plumbing | electricity | ac | painting | elevator | other
  priority TEXT NOT NULL DEFAULT 'normal',  -- low | normal | high | urgent
  title TEXT,
  description TEXT,
  assigned_to TEXT,
  status TEXT NOT NULL DEFAULT 'open',      -- open | in_progress | resolved
  due_at TEXT,
  resolved_at TEXT,
  cost_cents INTEGER,
  ${common}
);

CREATE TABLE ticket_events (
  id TEXT PRIMARY KEY,
  ticket_id TEXT REFERENCES maintenance_tickets(id),
  user_id TEXT,
  kind TEXT,             -- comment | status | assignment | reminder
  content TEXT,
  ${common}
);

-- ───────────── M9 — Rendez-vous, demandes, idées ─────────────
CREATE TABLE appointments (
  id TEXT PRIMARY KEY,
  property_id TEXT,
  person_id TEXT,
  visitor_name TEXT,
  visitor_phone TEXT,
  visitor_email TEXT,
  starts_at TEXT,
  duration_min INTEGER NOT NULL DEFAULT 30,
  agent_id TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | confirmed | done | no_show | cancelled
  reminder_sent_at TEXT,
  notes TEXT,
  ${common}
);
CREATE INDEX idx_appointments_start ON appointments(starts_at);

CREATE TABLE inquiries (
  id TEXT PRIMARY KEY,
  kind TEXT,             -- question | complaint
  person_id TEXT,
  name TEXT,
  phone TEXT,
  email TEXT,
  subject TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  answered_at TEXT,
  ${common}
);

CREATE TABLE project_ideas (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  city TEXT,
  estimated_budget_cents INTEGER,
  status TEXT,
  ${common}
);

-- ───────────── M10 — Partenaires ─────────────
CREATE TABLE partners (
  id TEXT PRIMARY KEY,
  name TEXT,
  contact_person_id TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  ${common}
);

CREATE TABLE partner_projects (
  id TEXT PRIMARY KEY,
  partner_id TEXT REFERENCES partners(id),
  name TEXT,
  description TEXT,
  city TEXT,
  address TEXT,
  latitude REAL,
  longitude REAL,
  total_area_m2 REAL,
  units_count INTEGER,
  unit_types TEXT,       -- JSON : ["apartment","shop"]
  price_min_cents INTEGER,
  price_max_cents INTEGER,
  delivery_date TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  ${common}
);

-- ───────────── M11 — Notifications ─────────────
CREATE TABLE notification_rules (
  id TEXT PRIMARY KEY,
  event TEXT,            -- installment_due | installment_overdue | cheque_due | appointment | document_expiry | contract_end
  days_before INTEGER,
  channels TEXT,         -- JSON : ["app","sound","email","sms","whatsapp"]
  enabled INTEGER NOT NULL DEFAULT 1,
  ${common}
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  event TEXT,
  title TEXT,
  body TEXT,
  entity TEXT,
  entity_id TEXT,
  read_at TEXT,
  ${common}
);

CREATE TABLE outbox_messages (
  id TEXT PRIMARY KEY,
  channel TEXT,          -- email | sms | whatsapp
  recipient TEXT,
  subject TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'queued',    -- queued | sent | failed
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TEXT,
  ${common}
);
`;
