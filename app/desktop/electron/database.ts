import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import Database from 'better-sqlite3-multiple-ciphers';
import { safeStorage } from 'electron';
import { betterSqliteDriver } from '@alwasset/shared/db/drivers/better-sqlite3';
import type { SqlDriver } from '@alwasset/shared/db/driver';
import { migrate } from '@alwasset/shared/db/migrate';

/**
 * Clé de chiffrement de la base (256 bits), générée au premier lancement.
 * Elle est protégée par le trousseau macOS via `safeStorage` : copier le
 * fichier .db sur une autre machine ne permet pas de le lire.
 */
function loadOrCreateKey(keyFile: string): string {
  // Réservé aux tests automatisés sur des machines sans trousseau (CI Linux) :
  // la clé est alors stockée en clair. Jamais utilisé sur le Mac de l'agence.
  const insecure = process.env.ALWASSET_INSECURE_KEYSTORE === '1';
  if (!insecure && !safeStorage.isEncryptionAvailable()) {
    throw new Error('Le trousseau du système est indisponible : impossible de protéger la clé de la base.');
  }
  if (existsSync(keyFile)) {
    const raw = readFileSync(keyFile);
    return insecure ? raw.toString('utf8') : safeStorage.decryptString(raw);
  }
  const key = randomBytes(32).toString('hex');
  mkdirSync(dirname(keyFile), { recursive: true });
  writeFileSync(keyFile, insecure ? key : safeStorage.encryptString(key), { mode: 0o600 });
  return key;
}

export function openDatabase(dataDir: string): { driver: SqlDriver; close(): void; file: string } {
  mkdirSync(dataDir, { recursive: true });
  const file = join(dataDir, 'alwasset.db');
  return { file, ...openEncrypted(file, loadOrCreateKey(join(dataDir, 'alwasset.key'))) };
}

/** Ouvre (ou crée) une base chiffrée SQLCipher avec une clé hexadécimale de 256 bits. */
export function openEncrypted(file: string, key: string): { driver: SqlDriver; close(): void } {
  if (!/^[0-9a-f]{64}$/.test(key)) throw new Error('Clé de chiffrement invalide');
  const db = new Database(file);
  db.pragma(`cipher='sqlcipher'`);
  db.pragma(`legacy=4`);
  db.pragma(`key="x'${key}'"`);
  // Vérifie immédiatement que la clé ouvre bien la base.
  db.prepare('SELECT count(*) FROM sqlite_master').get();
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  const driver = betterSqliteDriver(db);
  migrate(driver);
  return { driver, close: () => db.close() };
}
