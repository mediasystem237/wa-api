#!/bin/bash

# Script d'initialisation de la base de données
# Usage: ./scripts/init-db.sh

set -e

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-whatsapp_api}"
DB_USER="${DB_USER:-whatsapp}"

echo "Initializing database..."

# Exécuter les migrations
for migration in migrations/*.sql; do
    echo "Running migration: $migration"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $migration
done

echo "Database initialized successfully!"

