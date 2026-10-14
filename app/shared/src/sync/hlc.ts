/**
 * Horloge logique hybride (HLC).
 *
 * Format texte triable lexicographiquement :
 *   "<ms sur 13 chiffres>-<compteur sur 5 chiffres>-<deviceId>"
 * Deux événements sont donc comparables par simple comparaison de chaînes,
 * y compris en SQL, et l'identifiant d'appareil départage les égalités.
 */
export class HybridClock {
  private lastMs = 0;
  private counter = 0;

  constructor(
    readonly deviceId: string,
    private readonly wallClock: () => number = Date.now,
  ) {
    if (!/^[A-Za-z0-9_]+$/.test(deviceId)) {
      throw new Error(`deviceId invalide pour l'horloge : ${deviceId}`);
    }
  }

  /** Horodatage d'un événement local. */
  now(): string {
    const wall = this.wallClock();
    if (wall > this.lastMs) {
      this.lastMs = wall;
      this.counter = 0;
    } else {
      this.counter++;
    }
    return formatHlc(this.lastMs, this.counter, this.deviceId);
  }

  /** Intègre l'horodatage d'un événement distant (garantit la causalité). */
  receive(remote: string): void {
    const { ms, counter } = parseHlc(remote);
    const wall = this.wallClock();
    const max = Math.max(wall, this.lastMs, ms);
    if (max === this.lastMs && max === ms) {
      this.counter = Math.max(this.counter, counter) + 1;
    } else if (max === this.lastMs) {
      this.counter++;
    } else if (max === ms) {
      this.counter = counter + 1;
    } else {
      this.counter = 0;
    }
    this.lastMs = max;
  }
}

export function formatHlc(ms: number, counter: number, deviceId: string): string {
  return `${String(ms).padStart(13, '0')}-${String(counter).padStart(5, '0')}-${deviceId}`;
}

export function parseHlc(hlc: string): { ms: number; counter: number; deviceId: string } {
  const m = /^(\d{13})-(\d{5})-([A-Za-z0-9_]+)$/.exec(hlc);
  if (!m) throw new Error(`HLC invalide : ${hlc}`);
  return { ms: Number(m[1]), counter: Number(m[2]), deviceId: m[3]! };
}
