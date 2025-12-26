#!/bin/bash

# Script de configuration automatique pour ReplyPro
# Usage: ./scripts/setup-replypro.sh

set -e

echo "🔧 Configuration pour ReplyPro"
echo "Backend: replypro.cm"
echo "API: api-wa.replypro.cm"
echo "================================"

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "docker/docker-compose.yml" ]; then
    echo "❌ Erreur: Exécutez ce script depuis la racine du projet"
    exit 1
fi

# Créer le fichier .env
echo "📝 Création du fichier .env..."

# Générer les secrets
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
ADMIN_KEY="admin_$(openssl rand -hex 32)"

cat > .env << EOF
# Configuration pour ReplyPro
# Backend: replypro.cm
# API: api-wa.replypro.cm

# Base de données
DB_PASSWORD=${DB_PASSWORD}
DB_HOST=postgres
DB_PORT=5432
DB_NAME=whatsapp_api
DB_USER=whatsapp

# Redis
REDIS_URL=redis://redis:6379

# Admin Key
ADMIN_KEY=${ADMIN_KEY}

# API
NODE_ENV=production
API_DOMAIN=api-wa.replypro.cm
PORT=3000

# CORS - Autoriser votre backend replypro.cm
CORS_ORIGINS=https://replypro.cm,https://www.replypro.cm,http://localhost:3000

# Media Whitelist - Domaines autorisés pour télécharger des médias
MEDIA_URL_WHITELIST=https://replypro.cm,https://www.replypro.cm

# Webhooks
WEBHOOK_TIMEOUT=10000
WEBHOOK_RETRY_ATTEMPTS=3
WEBHOOK_RETRY_DELAY=1000
WEBHOOK_LOG_RETENTION_DAYS=30

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000

# Baileys
BAILEYS_LOG_LEVEL=silent
MAX_RECONNECTION_ATTEMPTS=3
EOF

chmod 600 .env

echo "✅ Fichier .env créé!"
echo ""
echo "=========================================="
echo "🔐 VOS CLÉS DE SÉCURITÉ"
echo "=========================================="
echo "ADMIN_KEY: ${ADMIN_KEY}"
echo "DB_PASSWORD: ${DB_PASSWORD}"
echo "=========================================="
echo ""
echo "⚠️  IMPORTANT: Notez ces clés dans un endroit sûr!"
echo ""
echo "📋 Prochaines étapes:"
echo "1. Vérifiez le fichier .env"
echo "2. Déployez avec: docker-compose -f docker/docker-compose.yml up -d"
echo "3. Configurez Nginx (voir DEPLOY_REPLYPRO.md)"
echo "4. Obtenez le certificat SSL: certbot --nginx -d api-wa.replypro.cm"

