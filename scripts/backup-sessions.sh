#!/bin/bash

# Script de backup des sessions Baileys
# Usage: ./scripts/backup-sessions.sh
# À exécuter via cron job hebdomadaire

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups/sessions}"
SESSIONS_DIR="${SESSIONS_DIR:-./sessions}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/sessions_backup_${TIMESTAMP}.tar.gz"

# Créer le dossier de backup s'il n'existe pas
mkdir -p "$BACKUP_DIR"

echo "Starting sessions backup..."

# Vérifier que le dossier sessions existe
if [ ! -d "$SESSIONS_DIR" ]; then
    echo "Error: Sessions directory $SESSIONS_DIR does not exist"
    exit 1
fi

# Créer l'archive
tar -czf "$BACKUP_FILE" -C "$(dirname "$SESSIONS_DIR")" "$(basename "$SESSIONS_DIR")"

if [ $? -eq 0 ]; then
    echo "Backup created successfully: $BACKUP_FILE"
    
    # Supprimer les backups plus anciens que 30 jours
    find "$BACKUP_DIR" -name "sessions_backup_*.tar.gz" -mtime +30 -delete
    echo "Old backups cleaned up"
else
    echo "Error: Backup failed"
    exit 1
fi

