#!/bin/bash

# Script d'installation automatique de Nginx Proxy Manager
# Usage: ./scripts/install-nginx-proxy-manager.sh

set -e

echo "🚀 Installation de Nginx Proxy Manager"
echo "========================================"

# Vérifier que nous sommes root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Veuillez exécuter ce script avec sudo"
    exit 1
fi

# Vérifier Docker
if ! command -v docker &> /dev/null; then
    echo "📦 Installation de Docker..."
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sh /tmp/get-docker.sh
    rm /tmp/get-docker.sh
else
    echo "✅ Docker est déjà installé"
fi

# Vérifier Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "📦 Installation de Docker Compose..."
    apt update -qq
    apt install -y docker-compose
else
    echo "✅ Docker Compose est déjà installé"
fi

# Créer le répertoire pour NPM
NPM_DIR="/opt/nginx-proxy-manager"
echo "📁 Création du répertoire: ${NPM_DIR}"
mkdir -p ${NPM_DIR}
cd ${NPM_DIR}

# Créer le docker-compose.yml
echo "📝 Création du fichier docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
services:
  app:
    image: 'jc21/nginx-proxy-manager:latest'
    restart: unless-stopped
    ports:
      - '80:80'   # Trafic HTTP
      - '81:81'   # Interface d'administration
      - '443:443' # Trafic HTTPS
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
    networks:
      - npm-network

networks:
  npm-network:
    driver: bridge
EOF

# Créer les répertoires de données
echo "📁 Création des répertoires de données..."
mkdir -p data letsencrypt

# Configurer les permissions
chown -R root:root data letsencrypt
chmod -R 755 data letsencrypt

# Ouvrir les ports dans le firewall
echo "🔥 Configuration du firewall..."
ufw allow 80/tcp 2>/dev/null || echo "⚠️  Port 80 déjà ouvert ou UFW non configuré"
ufw allow 81/tcp 2>/dev/null || echo "⚠️  Port 81 déjà ouvert ou UFW non configuré"
ufw allow 443/tcp 2>/dev/null || echo "⚠️  Port 443 déjà ouvert ou UFW non configuré"

# Démarrer Nginx Proxy Manager
echo "🚀 Démarrage de Nginx Proxy Manager..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d
else
    docker compose up -d
fi

# Attendre le démarrage
echo "⏳ Attente du démarrage (10 secondes)..."
sleep 10

# Vérifier le statut
echo "📊 Vérification du statut..."
if command -v docker-compose &> /dev/null; then
    docker-compose ps
else
    docker compose ps
fi

# Afficher l'IP du serveur
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "========================================"
echo "✅ Installation terminée!"
echo "========================================"
echo ""
echo "🌐 Accès à l'interface d'administration:"
echo "   http://${SERVER_IP}:81"
echo "   OU"
echo "   http://81.17.96.129:81"
echo ""
echo "🔐 Identifiants par défaut:"
echo "   Email: admin@example.com"
echo "   Password: changeme"
echo ""
echo "⚠️  IMPORTANT: Changez ces identifiants dès la première connexion!"
echo ""
echo "📚 Documentation: https://nginxproxymanager.com/"
echo ""

