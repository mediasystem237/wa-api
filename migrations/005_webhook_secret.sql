-- Migration 005: Webhook secret
-- Ajoute une colonne pour stocker le secret webhook par instance

ALTER TABLE instances 
  ADD COLUMN IF NOT EXISTS webhook_secret VARCHAR(255);

-- Index pour les recherches (optionnel)
CREATE INDEX IF NOT EXISTS idx_instances_webhook_secret ON instances(webhook_secret);

COMMENT ON COLUMN instances.webhook_secret IS 'Secret pour signer les webhooks HMAC (généré automatiquement)';

