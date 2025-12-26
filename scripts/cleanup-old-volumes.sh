#!/bin/bash

# Script pour supprimer les anciens volumes Docker
# Usage: ./scripts/cleanup-old-volumes.sh

set -e

echo "🧹 Nettoyage des anciens volumes Docker"
echo "========================================"

# Lister les volumes
echo "Volumes existants:"
docker volume ls

# Supprimer les volumes de l'ancienne installation Evolution
echo ""
echo "Suppression des volumes Evolution..."
docker volume rm evolution_evolution_instances 2>/dev/null || echo "  ✓ evolution_evolution_instances (déjà supprimé ou inexistant)"
docker volume rm evolution_postgres_data 2>/dev/null || echo "  ✓ evolution_postgres_data (déjà supprimé ou inexistant)"
docker volume rm evolution_redis_data 2>/dev/null || echo "  ✓ evolution_redis_data (déjà supprimé ou inexistant)"

# Garder portainer_data si vous utilisez Portainer
read -p "Voulez-vous aussi supprimer le volume portainer_data? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker volume rm portainer_data 2>/dev/null || echo "  ✓ portainer_data (déjà supprimé ou inexistant)"
else
    echo "  → portainer_data conservé"
fi

# Nettoyage final
echo ""
echo "Nettoyage final du système Docker..."
docker system prune -f

echo ""
echo "✅ Nettoyage terminé!"
echo ""
echo "Volumes restants:"
docker volume ls

