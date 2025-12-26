#!/bin/bash

# Script de déploiement automatique pour Contabo VPS
# Usage: ./scripts/deploy-contabo.sh

set -e

echo "🚀 Déploiement API WhatsApp Baileys sur Contabo"
echo "================================================"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier que nous sommes root ou sudo
if [ "$EUID" -ne 0 ]; then 
    error "Veuillez exécuter ce script en tant que root ou avec sudo"
    exit 1
fi

# Étape 1: Nettoyage
info "Étape 1/7: Nettoyage des anciennes installations..."
read -p "Voulez-vous supprimer TOUS les conteneurs et images Docker existants? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    warn "Arrêt de tous les conteneurs..."
    docker stop $(docker ps -aq) 2>/dev/null || true
    
    warn "Suppression de tous les conteneurs..."
    docker rm $(docker ps -aq) 2>/dev/null || true
    
    read -p "Voulez-vous aussi supprimer TOUTES les images Docker? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        warn "Suppression de toutes les images..."
        docker rmi $(docker images -q) 2>/dev/null || true
    fi
    
    info "Nettoyage des volumes orphelins..."
    docker volume prune -f
    
    info "Nettoyage du système Docker..."
    docker system prune -af --volumes
else
    info "Nettoyage partiel (conteneurs arrêtés uniquement)..."
    docker stop $(docker ps -aq) 2>/dev/null || true
    docker rm $(docker ps -aq) 2>/dev/null || true
fi

# Étape 2: Installation des dépendances
info "Étape 2/7: Installation des dépendances système..."
apt update -qq
apt install -y git curl wget nano ufw nginx certbot python3-certbot-nginx

# Étape 3: Configuration du firewall
info "Étape 3/7: Configuration du firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable || true

# Étape 4: Vérification du répertoire
info "Étape 4/7: Vérification du répertoire de travail..."
if [ ! -f "docker/docker-compose.yml" ]; then
    error "Le fichier docker/docker-compose.yml n'existe pas!"
    error "Assurez-vous d'exécuter ce script depuis la racine du projet."
    exit 1
fi

# Étape 5: Configuration .env
info "Étape 5/7: Configuration de l'environnement..."
if [ ! -f ".env" ]; then
    warn "Le fichier .env n'existe pas. Création d'un fichier .env.example..."
    
    # Générer un mot de passe aléatoire pour la DB
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    ADMIN_KEY="admin_$(openssl rand -hex 32)"
    
    cat > .env << EOF
# Base de données
DB_PASSWORD=${DB_PASSWORD}
DB_HOST=postgres
DB_PORT=5432
DB_NAME=whatsapp_api
DB_USER=whatsapp

# Redis
REDIS_URL=redis://redis:6379

# Admin
ADMIN_KEY=${ADMIN_KEY}

# API
NODE_ENV=production
API_DOMAIN=api-wa.replypro.cm
PORT=3000

# CORS
CORS_ORIGINS=https://replypro.cm,https://www.replypro.cm

# Media
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
    info "Fichier .env créé avec des valeurs par défaut."
    warn "IMPORTANT: Modifiez le fichier .env avec vos valeurs personnalisées!"
    warn "ADMIN_KEY généré: ${ADMIN_KEY}"
    warn "DB_PASSWORD généré: ${DB_PASSWORD}"
    echo
    read -p "Appuyez sur Entrée pour continuer après avoir vérifié/modifié .env..."
else
    info "Fichier .env trouvé."
fi

# Étape 6: Création des répertoires
info "Étape 6/7: Création des répertoires nécessaires..."
mkdir -p sessions logs
chmod 755 sessions logs

# Étape 7: Déploiement Docker
info "Étape 7/7: Déploiement avec Docker..."
info "Construction des images..."
docker-compose -f docker/docker-compose.yml build

info "Démarrage des conteneurs..."
docker-compose -f docker/docker-compose.yml up -d

info "Attente du démarrage des services (30 secondes)..."
sleep 30

# Vérifier la santé
info "Vérification de la santé des services..."
if docker-compose -f docker/docker-compose.yml ps | grep -q "Up"; then
    info "Conteneurs démarrés avec succès!"
else
    error "Certains conteneurs ne sont pas démarrés. Vérifiez les logs:"
    error "docker-compose -f docker/docker-compose.yml logs"
    exit 1
fi

# Exécuter les migrations
info "Exécution des migrations de base de données..."
sleep 10
docker-compose -f docker/docker-compose.yml exec -T api npm run migrate || warn "Les migrations ont peut-être déjà été exécutées."

# Test de santé
info "Test de santé de l'API..."
sleep 5
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    info "✅ API est opérationnelle!"
else
    warn "⚠️  L'API ne répond pas encore. Vérifiez les logs:"
    warn "docker-compose -f docker/docker-compose.yml logs api"
fi

# Résumé
echo
echo "================================================"
info "Déploiement terminé!"
echo "================================================"
echo
info "Commandes utiles:"
echo "  - Voir les logs: docker-compose -f docker/docker-compose.yml logs -f"
echo "  - Redémarrer: docker-compose -f docker/docker-compose.yml restart"
echo "  - Arrêter: docker-compose -f docker/docker-compose.yml down"
echo
warn "Prochaines étapes:"
echo "  1. Configurez Nginx (voir DEPLOY_CONTABO.md)"
echo "  2. Obtenez un certificat SSL avec Certbot"
echo "  3. Testez l'API: curl http://localhost:3000/health"
echo
info "Votre ADMIN_KEY est dans le fichier .env"
echo

