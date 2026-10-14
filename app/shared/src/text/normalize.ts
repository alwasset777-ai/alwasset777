/**
 * Normalisation pour la recherche : insensible à la casse, aux accents
 * latins, aux signes diacritiques arabes et aux variantes d'écriture
 * courantes (أ/إ/آ → ا، ة → ه، ى → ي، ؤ → و، ئ → ي), chiffres arabes-indiens
 * convertis en chiffres latins.
 */
export function normalizeSearch(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accents latins
    .replace(/[ً-ٰٟـ]/g, '') // tashkeel + tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Découpe une requête en mots normalisés (tous doivent correspondre). */
export function searchTerms(query: string | null | undefined): string[] {
  return normalizeSearch(query).split(' ').filter(Boolean);
}

/** Échappe un terme pour un LIKE … ESCAPE '\'. */
export function likeEscape(term: string): string {
  return term.replace(/[\\%_]/g, (m) => `\\${m}`);
}
