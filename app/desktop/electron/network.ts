import { networkInterfaces } from 'node:os';

/** Adresses IPv4 du Mac sur les réseaux locaux (Wi-Fi, Ethernet). */
export function lanAddresses(): string[] {
  const out: string[] = [];
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      // Ignore les interfaces virtuelles courantes (VPN, Docker, VM).
      if (/^(docker|br-|veth|vmnet|utun|bridge|vboxnet)/.test(name)) continue;
      out.push(a.address);
    }
  }
  // Les réseaux privés classiques d'abord (192.168.x.x le plus souvent).
  const rank = (ip: string) => (ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : ip.startsWith('172.') ? 2 : 3);
  return out.sort((a, b) => rank(a) - rank(b));
}
