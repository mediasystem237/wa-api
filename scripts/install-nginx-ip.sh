#!/bin/bash

# Script d'installation automatique de Nginx pour accès IP
# Usage: ./scripts/install-nginx-ip.sh

set -e

echo "🔧 Installation automatique de Nginx pour accès IP"
echo "=================================================="

# Vérifier que nous sommes root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Veuillez exécuter ce script avec sudo"
    exit 1
fi

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "docker/nginx/nginx-ip-access.conf" ]; then
    echo "❌ Erreur: Exécutez ce script depuis la racine du projet"
    exit 1
fi

# Installer Nginx si pas déjà installé
if ! command -v nginx &> /dev/null; then
    echo "📦 Installation de Nginx..."
    apt update -qq
    apt install -y nginx
fi

# Créer les répertoires si nécessaire
echo "📁 Création des répertoires..."
mkdir -p /etc/nginx/conf.d
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled

# Copier la configuration
echo "📝 Copie de la configuration Nginx..."
cp docker/nginx/nginx-ip-access.conf /etc/nginx/conf.d/api-ip-access.conf

# Vérifier que nginx.conf inclut conf.d
if ! grep -q "include /etc/nginx/conf.d/\*.conf;" /etc/nginx/nginx.conf; then
    echo "📝 Ajout de l'inclusion conf.d dans nginx.conf..."
    # Ajouter dans le bloc http
    sed -i '/^http {/a\    include /etc/nginx/conf.d/*.conf;' /etc/nginx/nginx.conf
fi

# Tester la configuration
echo "🧪 Test de la configuration Nginx..."
if nginx -t; then
    echo "✅ Configuration Nginx valide"
else
    echo "❌ Erreur dans la configuration Nginx"
    exit 1
fi

# Ouvrir le port 81 dans le firewall
echo "🔥 Configuration du firewall..."
ufw allow 81/tcp 2>/dev/null || echo "⚠️  UFW non configuré ou port déjà ouvert"

# Recharger Nginx
echo "🔄 Rechargement de Nginx..."
systemctl reload nginx

# Vérifier le statut
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx est actif"
else
    echo "⚠️  Nginx n'est pas actif, démarrage..."
    systemctl start nginx
fi

echo ""
echo "=================================================="
echo "✅ Installation terminée!"
echo "=================================================="
echo ""
echo "🌐 Accès disponible:"
echo "   - Health: http://81.17.96.129:81/health"
echo "   - API: http://81.17.96.129:81/api/v1/..."
echo "   - Docs: http://81.17.96.129:81/api-docs"
echo ""
echo "🧪 Test:"
echo "   curl http://81.17.96.129:81/health"
echo ""

