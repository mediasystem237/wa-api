-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_instances_api_key ON instances(api_key);
CREATE INDEX IF NOT EXISTS idx_instances_status ON instances(status);
CREATE INDEX IF NOT EXISTS idx_instances_name ON instances(instance_name);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_instance ON webhook_logs(instance_id, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event ON webhook_logs(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs(created_at DESC);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_instances_connected ON instances(status, connected_at) WHERE status = 'connected';
CREATE INDEX IF NOT EXISTS idx_webhook_logs_error ON webhook_logs(instance_id, created_at) WHERE error IS NOT NULL;

