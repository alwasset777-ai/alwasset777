import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

// database.ts importe `safeStorage` d'Electron, inutile ici.
vi.mock('electron', () => ({ safeStorage: {} }));
const { openEncrypted } = await import('../electron/database');

describe('base chiffrée (SQLCipher)', () => {
  it('écrit une base illisible sans la clé et la rouvre avec la bonne clé', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'alw-db-')), 'test.db');
    const key = randomBytes(32).toString('hex');
    const a = openEncrypted(file, key);
    a.driver.run("INSERT INTO app_settings (key, value) VALUES ('secret', 'الوسيط 777')");
    a.close();

    const bytes = readFileSync(file);
    expect(bytes.subarray(0, 16).toString('latin1')).not.toContain('SQLite format 3');
    expect(bytes.includes(Buffer.from('الوسيط 777'))).toBe(false);

    const b = openEncrypted(file, key);
    expect(b.driver.get<{ value: string }>("SELECT value FROM app_settings WHERE key = 'secret'")!.value).toBe('الوسيط 777');
    b.close();

    expect(() => openEncrypted(file, randomBytes(32).toString('hex'))).toThrow();
  });
});
