import { createHash, randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform, type Readable } from 'node:stream';
import { isSha256, mimeFromName, type StoredFile } from '@alwasset/shared/services/media';

/** Génère une miniature JPEG (null si le format n'est pas une image lisible). */
export type Thumbnailer = (file: string, mime: string) => Promise<{ jpeg: Buffer; width: number; height: number } | null>;

/**
 * Stockage des médias sur le disque, adressé par contenu (SHA-256) :
 *   <racine>/files/ab/abcdef…   (un fichier identique n'est stocké qu'une fois)
 * La base ne contient que les métadonnées ; la capacité n'est limitée que
 * par le disque du Mac (ou un disque externe choisi plus tard).
 */
export class MediaStore {
  constructor(
    readonly root: string,
    private readonly thumbnailer: Thumbnailer | null,
  ) {
    mkdirSync(join(root, 'files'), { recursive: true });
    mkdirSync(join(root, 'tmp'), { recursive: true });
  }

  pathOf(sha: string): string {
    if (!isSha256(sha)) throw new Error('Empreinte invalide');
    return join(this.root, 'files', sha.slice(0, 2), sha);
  }

  has(sha: string): boolean {
    return isSha256(sha) && existsSync(this.pathOf(sha));
  }

  /** Importe un fichier local (copie + empreinte + miniature). */
  importFile(path: string, originalName = basename(path)): Promise<StoredFile> {
    if (!statSync(path).isFile()) throw new Error(`Pas un fichier : ${path}`);
    return this.importStream(createReadStream(path), originalName);
  }

  /** Importe un flux (ex. envoi depuis un téléphone), avec une taille maximale optionnelle. */
  async importStream(input: Readable, originalName: string, maxBytes = Number.POSITIVE_INFINITY): Promise<StoredFile> {
    const name = sanitizeName(originalName);
    const tmp = join(this.root, 'tmp', randomBytes(12).toString('hex'));
    const hash = createHash('sha256');
    let size = 0;
    const meter = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        size += chunk.length;
        if (size > maxBytes) return cb(new Error('Fichier trop volumineux'));
        hash.update(chunk);
        cb(null, chunk);
      },
    });
    try {
      await pipeline(input, meter, createWriteStream(tmp));
    } catch (err) {
      rmSync(tmp, { force: true });
      throw err;
    }
    if (size === 0) {
      rmSync(tmp, { force: true });
      throw new Error('Fichier vide');
    }
    const sha = hash.digest('hex');
    const dest = this.pathOf(sha);
    if (existsSync(dest)) rmSync(tmp, { force: true });
    else {
      mkdirSync(join(this.root, 'files', sha.slice(0, 2)), { recursive: true });
      renameSync(tmp, dest);
    }
    const mime = mimeFromName(name);
    const thumb = mime.startsWith('image/') ? await this.makeThumb(dest, mime) : null;
    return { sha256: sha, sizeBytes: size, mime, originalName: name, thumbSha256: thumb?.sha ?? null, width: thumb?.width ?? null, height: thumb?.height ?? null };
  }

  private async makeThumb(file: string, mime: string) {
    if (!this.thumbnailer) return null;
    try {
      const t = await this.thumbnailer(file, mime);
      if (!t) return null;
      const sha = createHash('sha256').update(t.jpeg).digest('hex');
      const dest = this.pathOf(sha);
      if (!existsSync(dest)) {
        mkdirSync(join(this.root, 'files', sha.slice(0, 2)), { recursive: true });
        const tmp = join(this.root, 'tmp', randomBytes(12).toString('hex'));
        await pipeline(async function* () { yield t.jpeg; }, createWriteStream(tmp));
        renameSync(tmp, dest);
      }
      return { sha, width: t.width, height: t.height };
    } catch {
      return null; // une miniature ratée ne bloque jamais l'import
    }
  }
}

function sanitizeName(name: string): string {
  const cleaned = basename(String(name)).replace(/[\u0000-\u001f<>:"/\\|?*]/g, '_').trim();
  return (cleaned || 'fichier').slice(0, 180);
}
