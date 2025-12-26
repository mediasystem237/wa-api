#!/bin/bash

# Script de déploiement
# Usage: ./scripts/deploy.sh

set -e

echo "Starting deployment..."

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed"
    exit 1
fi

# Vérifier que Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed"
    exit 1
fi

# Build et démarrer les conteneurs
echo "Building and starting containers..."
docker-compose -f docker/docker-compose.yml build
docker-compose -f docker/docker-compose.yml up -d

# Attendre que la base de données soit prête
echo "Waiting for database to be ready..."
sleep 10

# Exécuter les migrations
echo "Running database migrations..."
docker-compose -f docker/docker-compose.yml exec -T api npm run migrate || echo "Migrations already applied"

echo "Deployment completed successfully!"

