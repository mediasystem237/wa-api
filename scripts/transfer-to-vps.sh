#!/bin/bash

# Script pour transférer les fichiers vers le VPS en excluant les dossiers inutiles
# Usage: ./scripts/transfer-to-vps.sh [host]

set -e

HOST=${1:-contabo}
DEST="/opt/whatsapp-api"

echo "📤 Transfert vers le VPS: ${HOST}"
echo "Destination: ${DEST}"
echo "========================================"

# Vérifier que rsync est disponible
if ! command -v rsync &> /dev/null; then
    echo "❌ rsync n'est pas installé. Installation..."
    echo "Sur Windows, installez rsync via WSL ou Git Bash"
    exit 1
fi

# Exclure les dossiers/fichiers inutiles
rsync -avz --progress \
  --exclude='archive/' \
  --exclude='node_modules/' \
  --exclude='.git/' \
  --exclude='sessions/' \
  --exclude='logs/' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='*.log' \
  --exclude='.DS_Store' \
  --exclude='Thumbs.db' \
  --exclude='.vscode/' \
  --exclude='.idea/' \
  --exclude='coverage/' \
  --exclude='dist/' \
  --exclude='build/' \
  --exclude='tmp/' \
  --exclude='temp/' \
  ./ ${HOST}:${DEST}/

echo ""
echo "✅ Transfert terminé!"
echo ""
echo "Prochaines étapes sur le VPS:"
echo "  ssh ${HOST}"
echo "  cd ${DEST}"
echo "  chmod +x scripts/setup-replypro.sh"
echo "  ./scripts/setup-replypro.sh"

