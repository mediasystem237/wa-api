# Guide de Déploiement sur Contabo VPS

Ce guide vous permet de déployer l'API WhatsApp Baileys sur un VPS Contabo Ubuntu avec Docker préinstallé, en supprimant proprement les anciennes installations.

## 📋 Prérequis

- VPS Contabo Ubuntu (20.04+)
- Docker et Docker Compose installés
- Accès root ou sudo
- Domaine configuré (ex: `api-wa.replypro.cm`) pointant vers l'IP du VPS
- Ports 80 et 443 ouverts

## 🚀 Déploiement en 7 étapes

### Étape 1: Connexion SSH et préparation

```bash
# Se connecter au VPS (si vous avez configuré un alias SSH "contabo")
ssh contabo

# OU avec l'IP complète:
# ssh root@votre-ip-contabo

# Mettre à jour le système
apt update && apt upgrade -y

# Vérifier Docker
docker --version
docker-compose --version
```

### Étape 2: Nettoyage des anciennes installations

```bash
# Arrêter tous les conteneurs en cours
docker stop $(docker ps -aq) 2>/dev/null || true

# Supprimer tous les conteneurs
docker rm $(docker ps -aq) 2>/dev/null || true

# Supprimer toutes les images (optionnel, si vous voulez tout nettoyer)
# ATTENTION: Cela supprimera TOUTES les images Docker
docker rmi $(docker images -q) 2>/dev/null || true

# Nettoyer les volumes orphelins
docker volume prune -f

# Nettoyer le système Docker
docker system prune -af --volumes

# Vérifier qu'il ne reste rien
docker ps -a
docker images
docker volume ls
```

### Étape 3: Installation des dépendances système

```bash
# Installer les outils nécessaires
apt install -y git curl wget nano ufw

# Installer Nginx (si pas déjà installé)
apt install -y nginx

# Installer Certbot pour SSL
apt install -y certbot python3-certbot-nginx

# Configurer le firewall
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
```

### Étape 4: Cloner le projet

```bash
# Créer un répertoire pour l'application
mkdir -p /opt/whatsapp-api
cd /opt/whatsapp-api

# Cloner le repository (remplacez par votre URL Git)
# Si vous avez déjà le code, copiez-le ici
# git clone https://github.com/votre-repo/api-whatsapp-baileys.git .

# OU si vous transférez les fichiers manuellement:
# Utilisez scp ou rsync depuis votre machine locale
```

**Si vous transférez les fichiers manuellement depuis Windows:**

```powershell
# Depuis PowerShell sur votre machine Windows
# Si vous avez configuré "ssh contabo", utilisez aussi "scp contabo:"
cd "G:\API WAHATSAPP BAYLEYS"
scp -r * contabo:/opt/whatsapp-api/

# OU si scp ne fonctionne pas avec l'alias, utilisez la commande complète:
# scp -r * root@votre-ip:/opt/whatsapp-api/
```

### Étape 5: Configuration de l'environnement

```bash
cd /opt/whatsapp-api

# Créer le fichier .env
nano .env
```

**Contenu du fichier `.env`:**

```env
# Base de données
DB_PASSWORD=GénérezUnMotDePasseFortEtUnique123!
DB_HOST=postgres
DB_PORT=5432
DB_NAME=whatsapp_api
DB_USER=whatsapp

# Redis
REDIS_URL=redis://redis:6379

# Admin
ADMIN_KEY=admin_$(openssl rand -hex 32)

# API
NODE_ENV=production
API_DOMAIN=api-wa.replypro.cm
PORT=3000

# CORS (remplacez par vos domaines autorisés)
CORS_ORIGINS=https://replypro.cm,https://www.replypro.cm

# Media (domaines autorisés pour télécharger des médias)
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
```

**Générer l'ADMIN_KEY:**

```bash
# Générer une clé admin sécurisée
echo "ADMIN_KEY=admin_$(openssl rand -hex 32)" >> .env
```

**Sécuriser le fichier .env:**

```bash
chmod 600 .env
```

### Étape 6: Déploiement Docker

```bash
cd /opt/whatsapp-api

# Créer les répertoires nécessaires
mkdir -p sessions logs

# Construire et démarrer les conteneurs
docker-compose -f docker/docker-compose.yml up -d --build

# Vérifier que tout démarre correctement
docker-compose -f docker/docker-compose.yml ps

# Voir les logs
docker-compose -f docker/docker-compose.yml logs -f
```

**Attendre que les services soient prêts (30-60 secondes), puis:**

```bash
# Exécuter les migrations de base de données
docker-compose -f docker/docker-compose.yml exec api npm run migrate

# Vérifier la santé de l'API
curl http://localhost:3000/health
```

### Étape 7: Configuration Nginx et SSL

```bash
# Créer la configuration Nginx
nano /etc/nginx/sites-available/api-wa.replypro.cm
```

**Contenu de la configuration Nginx:**

```nginx
# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name api-wa.replypro.cm;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Configuration HTTPS
server {
    listen 443 ssl http2;
    server_name api-wa.replypro.cm;

    # SSL (sera configuré par Certbot)
    # ssl_certificate /etc/letsencrypt/live/api-wa.replypro.cm/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/api-wa.replypro.cm/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logs
    access_log /var/log/nginx/api-wa-access.log;
    error_log /var/log/nginx/api-wa-error.log;

    # Taille max upload
    client_max_body_size 100M;
    client_body_timeout 300s;
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;

    # Proxy vers l'API
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:3000/health;
        access_log off;
    }
}
```

**Activer la configuration:**

```bash
# Créer le lien symbolique
ln -s /etc/nginx/sites-available/api-wa.replypro.cm /etc/nginx/sites-enabled/

# Supprimer la configuration par défaut (optionnel)
rm /etc/nginx/sites-enabled/default

# Tester la configuration
nginx -t

# Recharger Nginx
systemctl reload nginx
```

**Obtenir le certificat SSL:**

```bash
# Obtenir le certificat Let's Encrypt
certbot --nginx -d api-wa.replypro.cm

# Vérifier le renouvellement automatique
certbot renew --dry-run
```

**Le certificat SSL sera automatiquement ajouté à la configuration Nginx par Certbot.**

## ✅ Vérification finale

```bash
# Test de santé
curl https://api-wa.replypro.cm/health

# Test de création d'instance (avec votre ADMIN_KEY)
curl -X POST https://api-wa.replypro.cm/api/v1/instances \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: votre-admin-key" \
  -d '{
    "instanceName": "test-instance",
    "webhookUrl": "https://votre-backend.com/webhook"
  }'
```

## 🔄 Commandes utiles

### Gestion des conteneurs

```bash
# Voir les logs
docker-compose -f docker/docker-compose.yml logs -f api

# Redémarrer l'API
docker-compose -f docker/docker-compose.yml restart api

# Arrêter tout
docker-compose -f docker/docker-compose.yml down

# Redémarrer tout
docker-compose -f docker/docker-compose.yml up -d

# Voir l'utilisation des ressources
docker stats
```

### Mise à jour

```bash
cd /opt/whatsapp-api

# Sauvegarder les données importantes
docker-compose -f docker/docker-compose.yml exec postgres pg_dump -U whatsapp whatsapp_api > backup_$(date +%Y%m%d).sql

# Pull les nouvelles modifications (si Git)
git pull

# Rebuild et redémarrer
docker-compose -f docker/docker-compose.yml build
docker-compose -f docker/docker-compose.yml up -d

# Exécuter les nouvelles migrations
docker-compose -f docker/docker-compose.yml exec api npm run migrate
```

### Backup

```bash
# Backup base de données
docker-compose -f docker/docker-compose.yml exec postgres pg_dump -U whatsapp whatsapp_api > /opt/backups/db_$(date +%Y%m%d_%H%M%S).sql

# Backup sessions
tar -czf /opt/backups/sessions_$(date +%Y%m%d_%H%M%S).tar.gz /opt/whatsapp-api/sessions

# Créer un cron pour backup automatique (optionnel)
crontab -e
# Ajouter: 0 2 * * * /opt/whatsapp-api/scripts/backup.sh
```

## 🐛 Dépannage

### L'API ne démarre pas

```bash
# Vérifier les logs
docker-compose -f docker/docker-compose.yml logs api

# Vérifier les variables d'environnement
docker-compose -f docker/docker-compose.yml exec api env | grep DB

# Vérifier la connexion à la base de données
docker-compose -f docker/docker-compose.yml exec api node -e "require('./src/config/database.js').pool.query('SELECT 1').then(() => console.log('OK')).catch(e => console.error(e))"
```

### Erreur de connexion PostgreSQL

```bash
# Vérifier que PostgreSQL est démarré
docker-compose -f docker/docker-compose.yml ps postgres

# Vérifier les logs PostgreSQL
docker-compose -f docker/docker-compose.yml logs postgres

# Redémarrer PostgreSQL
docker-compose -f docker/docker-compose.yml restart postgres
```

### Nginx ne fonctionne pas

```bash
# Vérifier la configuration
nginx -t

# Vérifier les logs
tail -f /var/log/nginx/api-wa-error.log

# Vérifier que le port 3000 est accessible
curl http://127.0.0.1:3000/health
```

### Certificat SSL expiré

```bash
# Renouveler manuellement
certbot renew

# Vérifier le renouvellement automatique
systemctl status certbot.timer
```

## 📊 Monitoring

```bash
# Utilisation des ressources
docker stats

# Espace disque
df -h

# Logs en temps réel
docker-compose -f docker/docker-compose.yml logs -f

# Nombre de conteneurs actifs
docker ps | wc -l
```

## 🔒 Sécurité

- ✅ Firewall configuré (UFW)
- ✅ SSL/TLS activé (Let's Encrypt)
- ✅ Headers de sécurité (Nginx)
- ✅ Fichier .env protégé (chmod 600)
- ✅ API keys hashées en base de données
- ✅ Webhooks signés (HMAC)

## 📝 Notes importantes

1. **Sessions WhatsApp**: Les sessions sont stockées dans `/opt/whatsapp-api/sessions`. Faites des backups réguliers.

2. **Base de données**: Les données sont dans un volume Docker. Pour sauvegarder:
   ```bash
   docker-compose -f docker/docker-compose.yml exec postgres pg_dump -U whatsapp whatsapp_api > backup.sql
   ```

3. **Logs**: Les logs de l'application sont dans `/opt/whatsapp-api/logs` et les logs Nginx dans `/var/log/nginx/`.

4. **Mises à jour**: Toujours faire un backup avant de mettre à jour.

5. **ADMIN_KEY**: Gardez cette clé secrète et ne la partagez jamais. Elle permet un accès complet à l'API.

## 🆘 Support

En cas de problème:
1. Vérifier les logs: `docker-compose -f docker/docker-compose.yml logs`
2. Vérifier la santé: `curl https://api-wa.replypro.cm/health`
3. Vérifier les ressources: `docker stats`
4. Consulter `DEPLOYMENT.md` pour plus de détails

