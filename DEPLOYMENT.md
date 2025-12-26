# Guide de Déploiement Production

## Checklist pré-déploiement

### Sécurité

- [ ] Variables d'environnement configurées (`.env`)
- [ ] Permissions `.env` à `0600`
- [ ] `ADMIN_KEY` généré et sécurisé
- [ ] `DB_PASSWORD` fort et unique
- [ ] Certificat SSL obtenu (Let's Encrypt)
- [ ] CORS origins configurés
- [ ] Media URL whitelist configurée

### Infrastructure

- [ ] Docker et Docker Compose installés
- [ ] Nginx installé et configuré
- [ ] PostgreSQL 15+ disponible
- [ ] Redis 7+ disponible
- [ ] Domaine DNS configuré (A record)
- [ ] Firewall configuré (ports 80, 443)

### Base de données

- [ ] Base de données créée
- [ ] Migrations exécutées
- [ ] Index créés
- [ ] Backup automatique configuré

## Déploiement étape par étape

### 1. Préparation du serveur

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Installer Docker Compose
sudo apt install docker-compose -y

# Installer Nginx
sudo apt install nginx -y
```

### 2. Configuration DNS

```bash
# Vérifier que le domaine pointe vers le serveur
dig api-wa.replypro.cm
```

### 3. Obtenir le certificat SSL

```bash
# Installer Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtenir le certificat
sudo certbot --nginx -d api-wa.replypro.cm

# Vérifier le renouvellement automatique
sudo certbot renew --dry-run
```

### 4. Configuration de l'application

```bash
# Cloner le repository
git clone <repository-url>
cd api-whatsapp-baileys

# Copier la configuration Docker
cp .env.docker .env

# Éditer .env avec vos valeurs
nano .env
```

**Variables importantes**:
```env
DB_PASSWORD=your_secure_password_here
ADMIN_KEY=admin_your_64_char_hex_key_here
CORS_ORIGINS=https://yourdomain.com
MEDIA_URL_WHITELIST=https://yourdomain.com
```

### 5. Initialisation de la base de données

```bash
# Créer la base de données
createdb whatsapp_api

# Exécuter les migrations
npm install
npm run migrate
```

### 6. Déploiement avec Docker

```bash
# Build et démarrer
docker-compose -f docker/docker-compose.yml up -d

# Vérifier les logs
docker-compose -f docker/docker-compose.yml logs -f api

# Vérifier le statut
docker-compose -f docker/docker-compose.yml ps
```

### 7. Configuration Nginx

```bash
# Copier la configuration
sudo cp docker/nginx/nginx.conf /etc/nginx/sites-available/api-wa.replypro.cm

# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/api-wa.replypro.cm /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

### 8. Vérification

```bash
# Health check
curl https://api-wa.replypro.cm/health

# Test de création d'instance
curl -X POST https://api-wa.replypro.cm/api/v1/instances \
  -H "Content-Type: application/json" \
  -d '{"instanceName": "test-instance"}'
```

## Configuration Nginx complète

### Fichier: `/etc/nginx/sites-available/api-wa.replypro.cm`

Voir `docker/nginx/nginx.conf` pour la configuration complète avec:
- Redirection HTTP → HTTPS
- Headers de sécurité
- Proxy vers l'API
- Logs configurés

## Healthchecks

### Docker

Les healthchecks sont configurés dans `docker-compose.yml`:
- **API**: Vérifie `/health` toutes les 30s
- **PostgreSQL**: `pg_isready`
- **Redis**: `redis-cli ping`

### Monitoring

```bash
# Vérifier les healthchecks
docker-compose -f docker/docker-compose.yml ps

# Logs en temps réel
docker-compose -f docker/docker-compose.yml logs -f
```

## Backup et Restauration

### Backup des sessions

```bash
# Script de backup (cron hebdomadaire)
0 2 * * 0 /path/to/scripts/backup-sessions.sh
```

### Backup de la base de données

```bash
# Backup PostgreSQL
pg_dump -U whatsapp whatsapp_api > backup_$(date +%Y%m%d).sql

# Restauration
psql -U whatsapp whatsapp_api < backup_20240101.sql
```

### Restauration complète

1. Restaurer la base de données
2. Restaurer les sessions depuis le backup
3. Redémarrer les conteneurs

## Maintenance

### Purge des logs

```bash
# Script cron quotidien
0 3 * * * node /path/to/scripts/purge-old-logs.js
```

### Rotation des logs Nginx

```bash
# Configurer logrotate
sudo nano /etc/logrotate.d/api-wa

# Contenu:
/var/log/nginx/api-wa-*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}
```

### Mise à jour

```bash
# Pull les dernières modifications
git pull

# Rebuild et redémarrer
docker-compose -f docker/docker-compose.yml build
docker-compose -f docker/docker-compose.yml up -d

# Exécuter les nouvelles migrations
docker-compose -f docker/docker-compose.yml exec api npm run migrate
```

## Monitoring

### Métriques à surveiller

- **CPU**: < 80%
- **RAM**: < 80%
- **Disque**: < 80%
- **Connexions actives**: Nombre d'instances connectées
- **Taux d'erreur webhooks**: < 5%
- **Temps de réponse API**: < 500ms (p95)

### Logs

```bash
# Logs application
docker-compose -f docker/docker-compose.yml logs -f api

# Logs Nginx
sudo tail -f /var/log/nginx/api-wa-access.log
sudo tail -f /var/log/nginx/api-wa-error.log
```

## Dépannage

### L'API ne démarre pas

1. Vérifier les logs: `docker-compose logs api`
2. Vérifier les variables d'environnement
3. Vérifier que PostgreSQL et Redis sont accessibles

### Erreurs de connexion

1. Vérifier les healthchecks
2. Vérifier les logs Baileys
3. Vérifier les sessions (permissions, corruption)

### Webhooks ne fonctionnent pas

1. Vérifier l'URL webhook (HTTPS requis)
2. Vérifier les logs webhooks: `/api/v1/admin/instance/:name/logs`
3. Vérifier la signature HMAC

### Performance dégradée

1. Vérifier les index de base de données
2. Purger les anciens logs
3. Vérifier la charge système
4. Optimiser les requêtes

## Scaling

### Horizontal

Pour gérer plus d'instances:

1. **Load balancer**: Nginx en reverse proxy
2. **Plusieurs instances API**: Docker Swarm ou Kubernetes
3. **Base de données**: PostgreSQL avec réplication
4. **Redis**: Cluster Redis

### Vertical

- **CPU**: 2+ cores recommandés
- **RAM**: 2GB+ (500MB par instance active)
- **Disque**: SSD recommandé pour les sessions

## Support

Pour toute question de déploiement, consulter:
- `README.md` - Vue d'ensemble
- `SECURITY.md` - Guide de sécurité
- `QUICKSTART.md` - Démarrage rapide

