-- Table instances
CREATE TABLE IF NOT EXISTS instances (
    id SERIAL PRIMARY KEY,
    instance_name VARCHAR(100) UNIQUE NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    webhook_url TEXT,
    webhook_events JSONB DEFAULT '["message.received"]',
    status VARCHAR(20) DEFAULT 'created',
    phone_number VARCHAR(20),
    phone_name VARCHAR(255),
    qr_code TEXT,
    qr_expires_at TIMESTAMP,
    connected_at TIMESTAMP,
    disconnected_at TIMESTAMP,
    disconnect_reason TEXT,
    platform VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE instances IS 'Table des instances WhatsApp';
COMMENT ON COLUMN instances.instance_name IS 'Nom unique de l''instance';
COMMENT ON COLUMN instances.api_key IS 'Clé API unique pour authentification';
COMMENT ON COLUMN instances.webhook_url IS 'URL webhook pour recevoir les événements';
COMMENT ON COLUMN instances.webhook_events IS 'Liste des événements webhook à recevoir';
COMMENT ON COLUMN instances.status IS 'Statut: created, qr_ready, connecting, connected, disconnected, error';
COMMENT ON COLUMN instances.qr_code IS 'QR code en base64 (temporaire)';
COMMENT ON COLUMN instances.qr_expires_at IS 'Date d''expiration du QR code';

