-- Migration 006: Contraintes et index supplémentaires
-- Ajoute des contraintes de validation et des index pour améliorer les performances

-- Contrainte CHECK sur le statut
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_status'
  ) THEN
    ALTER TABLE instances 
      ADD CONSTRAINT check_status 
      CHECK (status IN ('created', 'qr_ready', 'connecting', 'connected', 'disconnected', 'error'));
  END IF;
END $$;

-- Index pour les webhooks par type d'événement
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event 
  ON webhook_logs(event_type, created_at DESC);

-- Index partiel pour les instances connectées (plus efficace)
CREATE INDEX IF NOT EXISTS idx_instances_connected 
  ON instances(status, connected_at DESC) 
  WHERE status = 'connected';

-- Index pour les recherches fréquentes de webhooks avec erreurs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_error 
  ON webhook_logs(instance_id, created_at DESC) 
  WHERE error IS NOT NULL;

COMMENT ON CONSTRAINT check_status ON instances IS 'Valide que le statut est dans la liste autorisée';

