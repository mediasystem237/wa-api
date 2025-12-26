-- Migration 007: Delivery ID pour idempotence des webhooks
-- Ajoute un UUID unique pour chaque webhook envoyé (permet la déduplication côté client)

ALTER TABLE webhook_logs 
  ADD COLUMN IF NOT EXISTS delivery_id UUID UNIQUE DEFAULT gen_random_uuid();

-- Index sur delivery_id pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_webhook_logs_delivery_id ON webhook_logs(delivery_id);

COMMENT ON COLUMN webhook_logs.delivery_id IS 'UUID unique pour chaque webhook envoyé (idempotence)';

