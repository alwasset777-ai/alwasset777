/** Coordonnées GPS en degrés décimaux (WGS84). */
export interface LatLng {
  lat: number;
  lng: number;
}

const valid = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

/**
 * Extrait des coordonnées d'une saisie libre :
 *  - « 33.5831, -7.6326 » ;
 *  - lien Google Maps (…/@33.58,-7.63,17z, ?q=33.58,-7.63, !3d33.58!4d-7.63, ll=…) ;
 *  - lien Apple Plans (?ll=33.58,-7.63) ou geo:33.58,-7.63.
 * Retourne null si rien d'exploitable (ex. lien court maps.app.goo.gl).
 */
export function parseCoordinates(input: string | null | undefined): LatLng | null {
  if (!input) return null;
  const s = decodeURIComponentSafe(input.trim());
  const num = '(-?\\d{1,3}(?:\\.\\d+)?)';
  const patterns = [
    new RegExp(`!3d${num}!4d${num}`), // position exacte du repère
    new RegExp(`@${num},${num}`),
    new RegExp(`[?&](?:q|ll|query|destination|daddr|center)=${num},\\s*${num}`),
    new RegExp(`^geo:${num},${num}`),
    new RegExp(`^${num}\\s*[,;\\s]\\s*${num}$`),
  ];
  for (const re of patterns) {
    const m = re.exec(s);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (valid(lat, lng)) return { lat: round6(lat), lng: round6(lng) };
    }
  }
  return null;
}

export function mapsUrl(p: LatLng): string {
  return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

function decodeURIComponentSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
