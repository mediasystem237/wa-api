-- Table webhook_logs
CREATE TABLE IF NOT EXISTS webhook_logs (
    id BIGSERIAL PRIMARY KEY,
    instance_id INTEGER REFERENCES instances(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE webhook_logs IS 'Logs des webhooks envoyés';
COMMENT ON COLUMN webhook_logs.instance_id IS 'ID de l''instance';
COMMENT ON COLUMN webhook_logs.event_type IS 'Type d''événement (qr.generated, message.received, etc.)';
COMMENT ON COLUMN webhook_logs.payload IS 'Payload JSON envoyé au webhook';
COMMENT ON COLUMN webhook_logs.status_code IS 'Code HTTP de la réponse';
COMMENT ON COLUMN webhook_logs.response_time_ms IS 'Temps de réponse en millisecondes';
COMMENT ON COLUMN webhook_logs.error IS 'Message d''erreur si échec';
COMMENT ON COLUMN webhook_logs.retry_count IS 'Nombre de tentatives';

