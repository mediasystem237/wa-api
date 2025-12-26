# Guide de démarrage rapide

## Installation locale

### 1. Prérequis

- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### 2. Installation

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos configurations
```

### 3. Base de données

```bash
# Créer la base de données
createdb whatsapp_api

# Exécuter les migrations
npm run migrate
```

### 4. Démarrer l'application

```bash
# Mode développement
npm run dev

# Mode production
npm start
```

L'API sera accessible sur `http://localhost:3000`

## Déploiement avec Docker

### 1. Configuration

```bash
# Créer le fichier .env
cp .env.example .env
# Éditer .env
```

### 2. Démarrer

```bash
# Build et démarrer
docker-compose -f docker/docker-compose.yml up -d

# Voir les logs
docker-compose -f docker/docker-compose.yml logs -f
```

### 3. Migrations

```bash
# Exécuter les migrations
docker-compose -f docker/docker-compose.yml exec api npm run migrate
```

## Configuration Nginx

### 1. Installer Certbot

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx
```

### 2. Obtenir le certificat SSL

```bash
sudo certbot --nginx -d api-wa.replypro.cm
```

### 3. Configurer Nginx

Copier `docker/nginx/nginx.conf` vers `/etc/nginx/sites-available/api-wa.replypro.cm`

```bash
sudo cp docker/nginx/nginx.conf /etc/nginx/sites-available/api-wa.replypro.cm
sudo ln -s /etc/nginx/sites-available/api-wa.replypro.cm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Premier test

### 1. Créer une instance

```bash
curl -X POST http://localhost:3000/api/v1/instance/create \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "test-instance",
    "webhookUrl": "https://your-webhook-url.com/webhook"
  }'
```

### 2. Connecter l'instance

```bash
curl -X POST http://localhost:3000/api/v1/instance/connect \
  -H "X-API-Key: wapi_your_api_key_here"
```

### 3. Scanner le QR code

Le QR code sera retourné dans la réponse. Scannez-le avec WhatsApp.

### 4. Envoyer un message

```bash
curl -X POST http://localhost:3000/api/v1/message/send \
  -H "X-API-Key: wapi_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "33612345678",
    "text": "Hello from API!"
  }'
```

## Documentation API

Accédez à la documentation Swagger interactive:
- Local: http://localhost:3000/api-docs
- Production: https://api-wa.replypro.cm/api-docs

## Health Check

```bash
curl http://localhost:3000/health
```

## Dépannage

### L'instance ne se connecte pas

1. Vérifier que PostgreSQL et Redis sont démarrés
2. Vérifier les logs: `docker-compose logs api`
3. Vérifier le statut: `GET /api/v1/instance/status`

### Les webhooks ne fonctionnent pas

1. Vérifier que l'URL webhook est en HTTPS
2. Vérifier les logs webhooks: `GET /api/v1/admin/instance/:name/logs`
3. Vérifier que le serveur webhook est accessible

### Erreurs de base de données

1. Vérifier que PostgreSQL est démarré
2. Vérifier les credentials dans `.env`
3. Réexécuter les migrations: `npm run migrate`

## Support

Pour plus d'informations, consultez:
- `DCD_FONCTIONNEL.md` - Documentation complète avec exemples
- `README.md` - Vue d'ensemble
- `DEPLOYMENT.md` - Guide de déploiement
- `SECURITY.md` - Mesures de sécurité

