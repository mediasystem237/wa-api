-- Migration 004: Hash API keys
-- Ajoute les colonnes pour stocker les hash des API keys au lieu des clés en clair

-- Ajouter colonnes pour hash
ALTER TABLE instances 
  ADD COLUMN IF NOT EXISTS api_key_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS api_key_last4 VARCHAR(4);

-- Index sur api_key_hash pour les recherches
CREATE INDEX IF NOT EXISTS idx_instances_api_key_hash ON instances(api_key_hash);

-- Note: La migration des clés existantes doit être faite côté application
-- car nous avons besoin de Node.js pour calculer les hash SHA-256
-- Voir scripts/migrate-api-keys.js pour la migration des données existantes

COMMENT ON COLUMN instances.api_key_hash IS 'Hash SHA-256 de l''API key (ne jamais stocker la clé en clair)';
COMMENT ON COLUMN instances.api_key_last4 IS '4 derniers caractères de l''API key pour affichage';

