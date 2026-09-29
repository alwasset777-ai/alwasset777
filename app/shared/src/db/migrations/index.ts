import { migration0001 } from './0001_init';

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

/** Liste ordonnée des migrations. Ne jamais modifier une migration publiée : en ajouter une nouvelle. */
export const migrations: Migration[] = [{ version: 1, name: 'init', sql: migration0001 }];

/** Tables techniques jamais synchronisées entre appareils. */
export const LOCAL_ONLY_TABLES = new Set([
  'app_settings',
  'change_log',
  'sync_field_clock',
  'sync_inbox',
  'devices',
  'schema_migrations',
]);

/** Colonnes sensibles qui ne quittent jamais le poste principal. */
export const NEVER_SYNC_COLUMNS: Record<string, readonly string[]> = {
  users: ['password_hash'],
};
