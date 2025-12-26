# Document de Conception Fonctionnelle (DCD)
## API WhatsApp Baileys

**Version**: 1.0.0  
**Date**: 2024  
**Domaine**: api-wa.replypro.cm

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Endpoints API](#endpoints-api)
4. [Webhooks](#webhooks)
5. [Schéma de base de données](#schéma-de-base-de-données)
6. [Sécurité](#sécurité)
7. [Déploiement](#déploiement)

---

## Vue d'ensemble

### Objectif

API REST complète permettant de gérer des connexions WhatsApp via Baileys, avec système de webhooks pour recevoir les événements en temps réel.

### Stack technique

- **Backend**: Node.js 18+ avec Express 4.x
- **Base de données**: PostgreSQL 15+
- **Cache**: Redis 7+
- **WhatsApp**: @whiskeysockets/baileys ^6.6.0
- **Déploiement**: Docker + Docker Compose
- **Reverse Proxy**: Nginx avec SSL

### Architecture

```
Internet → Nginx (SSL) → API Node.js → PostgreSQL
                              ↓           Redis
                         Baileys ←→ WhatsApp
                              ↓
                      Webhooks Client
```

---

## Endpoints API

### Base URL

- Production: `https://api-wa.replypro.cm`
- Développement: `http://localhost:3000`

### Authentification

Toutes les routes (sauf `/instance/create` et `/health`) nécessitent le header:
```
X-API-Key: wapi_your_api_key_here
```

### Gestion des instances

#### POST /api/v1/instance/create

Crée une nouvelle instance WhatsApp.

**Body:**
```json
{
  "instanceName": "my-whatsapp-bot",
  "webhookUrl": "https://example.com/webhook",
  "webhookEvents": ["message.received", "connection.connected"]
}
```

**Réponse 201:**
```json
{
  "success": true,
  "instance": {
    "id": 1,
    "name": "my-whatsapp-bot",
    "apiKey": "wapi_a1b2c3d4e5f6...",
    "webhookUrl": "https://example.com/webhook",
    "webhookEvents": ["message.received", "connection.connected"],
    "status": "created",
    "createdAt": "2024-01-01T10:00:00Z"
  },
  "message": "Instance created successfully"
}
```

#### POST /api/v1/instance/connect

Connecte l'instance et génère un QR code.

**Réponse 200:**
```json
{
  "success": true,
  "status": "qr_ready",
  "qrCode": "data:image/png;base64,iVBORw0KG...",
  "message": "Scan the QR code with WhatsApp",
  "webhookEvents": ["qr.generated", "connection.connected"]
}
```

#### GET /api/v1/instance/status

Récupère le statut de l'instance.

**Réponse 200:**
```json
{
  "instance": "my-whatsapp-bot",
  "status": "connected",
  "connected": true,
  "phoneNumber": "33612345678",
  "phoneName": "Mon WhatsApp",
  "qrCode": null,
  "connectedAt": "2024-01-01T10:05:00Z",
  "createdAt": "2024-01-01T10:00:00Z",
  "uptime": 3600
}
```

#### POST /api/v1/instance/disconnect

Déconnecte l'instance.

#### POST /api/v1/instance/restart

Redémarre la connexion.

#### DELETE /api/v1/instance/delete

Supprime définitivement l'instance.

#### PATCH /api/v1/instance/webhook

Met à jour la configuration webhook.

**Body:**
```json
{
  "webhookUrl": "https://new-url.com/webhook",
  "webhookEvents": ["message.received"]
}
```

### Messages

#### POST /api/v1/message/send

Envoie un message texte.

**Body:**
```json
{
  "to": "33612345678",
  "text": "Bonjour ! 👋"
}
```

**Réponse 200:**
```json
{
  "success": true,
  "messageId": "3EB0B430B23D...",
  "timestamp": 1704110400,
  "to": "33612345678@s.whatsapp.net"
}
```

#### POST /api/v1/message/image

Envoie une image.

**Body:**
```json
{
  "to": "33612345678",
  "imageUrl": "https://example.com/image.jpg",
  "caption": "Regardez cette image !",
  "filename": "image.jpg"
}
```

#### POST /api/v1/message/video

Envoie une vidéo.

**Body:**
```json
{
  "to": "33612345678",
  "videoUrl": "https://example.com/video.mp4",
  "caption": "Regardez cette vidéo !",
  "gifPlayback": false
}
```

#### POST /api/v1/message/document

Envoie un document.

**Body:**
```json
{
  "to": "33612345678",
  "documentUrl": "https://example.com/file.pdf",
  "filename": "document.pdf",
  "caption": "Voici le document"
}
```

#### POST /api/v1/message/audio

Envoie un audio.

**Body:**
```json
{
  "to": "33612345678",
  "audioUrl": "https://example.com/audio.mp3",
  "ptt": true
}
```

#### POST /api/v1/message/location

Envoie une localisation.

**Body:**
```json
{
  "to": "33612345678",
  "latitude": 48.8566,
  "longitude": 2.3522,
  "name": "Tour Eiffel",
  "address": "Champ de Mars, Paris"
}
```

#### POST /api/v1/message/contact

Envoie un contact (vCard).

**Body:**
```json
{
  "to": "33612345678",
  "contacts": [
    {
      "fullName": "Jean Dupont",
      "phoneNumber": "+33612345678",
      "organization": "Acme Corp",
      "email": "jean@example.com"
    }
  ]
}
```

#### POST /api/v1/message/react

Réagit à un message.

**Body:**
```json
{
  "messageId": "3EB0B430B23D...",
  "emoji": "❤️",
  "remove": false
}
```

#### POST /api/v1/message/reply

Répond à un message (citation).

**Body:**
```json
{
  "to": "33612345678",
  "text": "Oui, c'est confirmé !",
  "quotedMessageId": "3EB0B430B23D..."
}
```

### Groupes

#### GET /api/v1/groups

Liste tous les groupes.

#### GET /api/v1/group/:groupId

Récupère les détails d'un groupe.

#### POST /api/v1/group/create

Crée un groupe.

**Body:**
```json
{
  "name": "Mon Groupe",
  "participants": ["33612345678", "33687654321"]
}
```

#### POST /api/v1/group/:groupId/participants

Ajoute des participants.

#### DELETE /api/v1/group/:groupId/participants

Retire des participants.

#### POST /api/v1/group/:groupId/leave

Quitte un groupe.

### Contacts

#### GET /api/v1/check/:phoneNumber

Vérifie si un numéro a WhatsApp.

#### GET /api/v1/profile-picture/:jid

Récupère la photo de profil.

#### GET /api/v1/status/:jid

Récupère le statut d'un utilisateur.

### Administration

Toutes les routes admin nécessitent le header `X-Admin-Key`.

#### GET /api/v1/admin/instances

Liste toutes les instances.

#### GET /api/v1/admin/metrics

Récupère les métriques système.

#### GET /api/v1/admin/instance/:name/logs

Récupère les logs d'une instance.

#### POST /api/v1/admin/cleanup

Nettoie les sessions orphelines.

### Health

#### GET /health

Health check de l'API.

**Réponse 200:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 3600,
  "connections": {
    "active": 5,
    "total": 5
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## Webhooks

### Configuration

Les webhooks sont envoyés à l'URL configurée lors de la création de l'instance.

### Format des webhooks

Tous les webhooks sont envoyés en POST avec le format suivant:

**Headers:**
```
Content-Type: application/json
X-Instance: instance-name
X-Event: event-type
User-Agent: WhatsApp-API/1.0
```

**Body:**
```json
{
  "event": "event-type",
  "instance": "instance-name",
  "apiKey": "wapi_...",
  "timestamp": 1704110400000,
  "data": {
    // Données spécifiques à l'événement
  }
}
```

### Événements disponibles

#### qr.generated

Quand un QR code est généré.

```json
{
  "event": "qr.generated",
  "instance": "my-whatsapp-bot",
  "apiKey": "wapi_...",
  "timestamp": 1704110400000,
  "data": {
    "qr": "2@abc123...",
    "qrImage": "data:image/png;base64,...",
    "expiresAt": "2024-01-01T10:01:00Z"
  }
}
```

#### connection.connected

Quand WhatsApp est connecté.

```json
{
  "event": "connection.connected",
  "instance": "my-whatsapp-bot",
  "apiKey": "wapi_...",
  "timestamp": 1704110400000,
  "data": {
    "phoneNumber": "33612345678",
    "phoneName": "Mon WhatsApp",
    "platform": "android"
  }
}
```

#### connection.disconnected

Quand WhatsApp est déconnecté.

```json
{
  "event": "connection.disconnected",
  "instance": "my-whatsapp-bot",
  "apiKey": "wapi_...",
  "timestamp": 1704110400000,
  "data": {
    "reason": "Connection closed",
    "shouldReconnect": true
  }
}
```

#### message.received

Quand un message est reçu.

```json
{
  "event": "message.received",
  "instance": "my-whatsapp-bot",
  "apiKey": "wapi_...",
  "timestamp": 1704110400000,
  "data": {
    "messageId": "3EB0B430B23D...",
    "from": "33612345678@s.whatsapp.net",
    "fromName": "Jean Dupont",
    "timestamp": 1704110400,
    "messageType": "conversation",
    "isGroup": false,
    "text": "Bonjour !",
    "raw": { /* objet complet du message */ }
  }
}
```

#### message.sent

Quand un message est envoyé.

#### message.ack

Quand un accusé de réception est reçu.

```json
{
  "event": "message.ack",
  "instance": "my-whatsapp-bot",
  "apiKey": "wapi_...",
  "timestamp": 1704110400000,
  "data": {
    "messageId": "3EB0B430B23D...",
    "ack": 3,
    "timestamp": 1704110400
  }
}
```

#### group.update

Quand un groupe est modifié.

### Retry Policy

- 3 tentatives maximum
- Backoff exponentiel (1s, 2s, 4s)
- Timeout: 10 secondes par tentative
- Logs de tous les webhooks (succès/échec)

---

## Schéma de base de données

### Table: instances

```sql
CREATE TABLE instances (
    id SERIAL PRIMARY KEY,
    instance_name VARCHAR(100) UNIQUE NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    webhook_url TEXT,
    webhook_events JSONB DEFAULT '["message.received"]',
    status VARCHAR(20) DEFAULT 'created',
    phone_number VARCHAR(20),
    phone_name VARCHAR(255),
    qr_code TEXT,
    qr_expires_at TIMESTAMP,
    connected_at TIMESTAMP,
    disconnected_at TIMESTAMP,
    disconnect_reason TEXT,
    platform VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table: webhook_logs

```sql
CREATE TABLE webhook_logs (
    id BIGSERIAL PRIMARY KEY,
    instance_id INTEGER REFERENCES instances(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Index

- `idx_instances_api_key` sur `instances(api_key)`
- `idx_instances_status` sur `instances(status)`
- `idx_webhook_logs_instance` sur `webhook_logs(instance_id, created_at)`

---

## Sécurité

### Authentification

- API keys au format `wapi_{64 hex chars}`
- Admin keys au format `admin_{64 hex chars}`
- Validation stricte des headers

### Rate Limiting

- Par IP et par API key
- Limites configurables par endpoint
- Headers `X-RateLimit-*` dans les réponses

### Validation

- Validation stricte de tous les inputs
- Sanitization des données
- HTTPS obligatoire pour les webhooks

### Protection

- Helmet.js pour les headers de sécurité
- CORS configuré
- Validation des URLs webhook (HTTPS uniquement)

---

## Déploiement

### Prérequis

- Docker & Docker Compose
- Nginx
- Certificat SSL (Let's Encrypt)

### Étapes

1. **Configurer les variables d'environnement**
   ```bash
   cp .env.example .env
   # Éditer .env
   ```

2. **Initialiser la base de données**
   ```bash
   npm run migrate
   ```

3. **Démarrer avec Docker**
   ```bash
   docker-compose -f docker/docker-compose.yml up -d
   ```

4. **Configurer Nginx**
   - Copier `docker/nginx/nginx.conf` vers `/etc/nginx/sites-available/`
   - Obtenir le certificat SSL avec Certbot
   - Activer le site

5. **Vérifier**
   ```bash
   curl https://api-wa.replypro.cm/health
   ```

---

## Codes d'erreur

- `API_KEY_MISSING` - Header X-API-Key manquant
- `INVALID_API_KEY` - API key invalide
- `INSTANCE_NOT_FOUND` - Instance non trouvée
- `INSTANCE_NOT_CONNECTED` - Instance non connectée
- `VALIDATION_ERROR` - Erreur de validation
- `RATE_LIMIT_EXCEEDED` - Limite de taux dépassée
- `INVALID_PHONE_NUMBER` - Numéro de téléphone invalide
- `MEDIA_TOO_LARGE` - Média trop volumineux

---

## Documentation API

La documentation Swagger est disponible sur:
- `/api-docs` (interface interactive)

---

**Fin du document**

