# Guide de Sécurité - API WhatsApp Baileys

## Vue d'ensemble

Ce document décrit les mesures de sécurité implémentées dans l'API WhatsApp Baileys et les bonnes pratiques à suivre.

## Authentification

### API Keys

- **Format**: `wapi_{64 caractères hexadécimaux}`
- **Stockage**: Les API keys sont **hashées** en base de données (SHA-256)
- **Comparaison**: Utilisation de comparaison constant-time pour éviter les timing attacks
- **Affichage**: Seuls les 4 derniers caractères sont stockés pour affichage

**Important**: L'API key n'est retournée qu'une seule fois lors de la création de l'instance. Sauvegardez-la immédiatement.

### Admin Keys

- **Format**: `admin_{64 caractères hexadécimaux}`
- **Usage**: Uniquement pour les routes d'administration
- **Stockage**: Variable d'environnement (ne jamais commiter)

## Webhooks

### Signatures HMAC

Tous les webhooks sont signés avec HMAC-SHA256 pour garantir leur authenticité.

**Headers envoyés**:
- `X-Signature: sha256={signature}`
- `X-Webhook-Timestamp: {timestamp}`

**Validation côté client**:

```javascript
const crypto = require('crypto');

function verifyWebhook(signature, payload, secret, timestamp) {
  // Vérifier la fenêtre de temps (5 minutes)
  const now = Date.now();
  const diff = Math.abs(now - timestamp) / 1000;
  if (diff > 300) {
    return false; // Trop ancien
  }
  
  // Calculer la signature attendue
  const message = `${timestamp}.${JSON.stringify(payload)}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
  
  // Comparer (constant-time)
  const receivedSignature = signature.replace('sha256=', '');
  return crypto.timingSafeEqual(
    Buffer.from(receivedSignature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

### Delivery ID

Chaque webhook inclut un `deliveryId` unique (UUID) pour permettre la déduplication côté client.

### Protection Replay

- Fenêtre de temps: 5 minutes maximum
- Timestamp inclus dans chaque webhook
- Validation automatique côté serveur

## Protection SSRF (médias)

### Validation des URLs

- **HTTPS obligatoire** (sauf localhost en développement)
- **Whitelist de domaines** configurable via `MEDIA_URL_WHITELIST`
- **Blocage des IPs privées** (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
- **Timeout strict**: 30 secondes maximum
- **Taille max vérifiée** avant téléchargement

### Configuration

```env
MEDIA_URL_WHITELIST=https://example.com,https://cdn.example.com
```

## Rate Limiting

### Multi-niveaux

1. **Par IP**: Protection globale anti-abuse
2. **Par API key**: Protection si clé compromise
3. **Par endpoint**: Limites spécifiques

### Limites par défaut

- Création d'instance: 10/heure par IP
- Connexion: 5/heure par instance
- Messages texte: 100/minute par instance
- Messages média: 50/minute par instance
- Appels généraux: 1000/heure par API key

### Headers de réponse

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 2024-01-01T12:00:00Z
```

## Logs et Redaction

### Données redactées

Les logs ne contiennent jamais:
- API keys
- Admin keys
- Passwords
- Secrets webhook
- Tokens
- Cookies

### Configuration Pino

```javascript
redact: {
  paths: [
    'req.headers.authorization',
    'req.headers["x-api-key"]',
    '*.apiKey',
    '*.password',
    '*.secret'
  ],
  remove: true
}
```

## HTTPS et TLS

- **HTTPS obligatoire** en production
- **TLS 1.2+** uniquement
- **HSTS** activé (max-age=31536000)
- **Certificats Let's Encrypt** recommandés

## Headers de sécurité

### Nginx

- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy`

### Helmet.js

Configuration automatique via Helmet.js dans l'application.

## CORS

- **Pas de wildcard** en production
- **Whitelist d'origins** configurable
- **Credentials** supportés si nécessaire

```env
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

## Gestion des secrets

### Variables d'environnement

- **Permissions**: `.env` doit avoir les permissions `0600` (read/write owner only)
- **Ne jamais commiter**: Ajouter `.env` au `.gitignore`
- **Rotation**: Procédure de rotation documentée

### Docker Secrets

Pour une sécurité renforcée, utiliser Docker secrets au lieu de variables d'environnement.

## Concurrence et Locks

### Une seule connexion par instance

- **Redis locks** pour éviter les connexions multiples
- **TTL automatique**: 5 minutes (auto-release si crash)
- **Vérification avant connexion**: Erreur si lock existe

## Base de données

### Contraintes

- **CHECK constraints** sur les statuts
- **Foreign keys** avec CASCADE
- **Index** pour performance et sécurité

### Purge automatique

- **Webhook logs**: Purge après 30 jours (configurable)
- **Script cron**: `scripts/purge-old-logs.js`

## Recommandations

1. **Rotation des clés**: Changer les API keys et admin keys régulièrement
2. **Monitoring**: Surveiller les tentatives d'authentification échouées
3. **Backup**: Sauvegarder régulièrement les sessions Baileys
4. **Updates**: Maintenir les dépendances à jour
5. **Audit**: Réviser régulièrement les logs d'accès

## Incident Response

En cas de compromission:

1. **Révoquer immédiatement** l'API key compromise
2. **Changer** tous les secrets (admin key, webhook secrets)
3. **Analyser** les logs pour identifier l'étendue
4. **Notifier** les utilisateurs affectés
5. **Documenter** l'incident

## Contact

Pour signaler une vulnérabilité de sécurité, contactez l'équipe de développement.

