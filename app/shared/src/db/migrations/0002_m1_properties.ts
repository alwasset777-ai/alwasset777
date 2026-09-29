/**
 * Migration 0002 — module M1 (biens).
 *  - properties.search_text : texte normalisé (arabe/latin) pour la recherche ;
 *  - media.original_name / width / height : métadonnées des fichiers importés.
 */
export const migration0002 = `
ALTER TABLE properties ADD COLUMN search_text TEXT;
CREATE INDEX idx_properties_type ON properties(type);
CREATE INDEX idx_properties_purpose ON properties(purpose);
ALTER TABLE media ADD COLUMN original_name TEXT;
ALTER TABLE media ADD COLUMN width INTEGER;
ALTER TABLE media ADD COLUMN height INTEGER;
CREATE INDEX idx_media_sha ON media(sha256);
CREATE INDEX idx_property_owners_property ON property_owners(property_id);
`;
