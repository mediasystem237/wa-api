# API WhatsApp Baileys

API REST complète pour gérer des connexions WhatsApp via Baileys, avec système de webhooks, authentification par API key, et architecture prête pour production.

## 🚀 Fonctionnalités

- ✅ Gestion des instances WhatsApp
- ✅ Connexion via QR code
- ✅ Envoi/réception de messages (texte, média, audio, vidéo, documents)
- ✅ Gestion des groupes
- ✅ Système de webhooks
- ✅ Rate limiting
- ✅ Authentification par API key
- ✅ Health checks et monitoring

## 📋 Prérequis

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optionnel)

## 🛠️ Installation

1. Cloner le repository
```bash
git clone <repository-url>
cd api-whatsapp-baileys
```

2. Installer les dépendances
```bash
npm install
```

3. Configurer les variables d'environnement
```bash
cp .env.example .env
# Éditer .env avec vos configurations
```

4. Initialiser la base de données
```bash
npm run migrate
```

5. Démarrer l'application
```bash
npm start
```

## 🐳 Déploiement avec Docker

### Configuration

```bash
# Copier la configuration Docker
cp .env.docker .env

# Éditer .env avec vos valeurs
nano .env
```

### Démarrage

```bash
# Build et démarrer
docker-compose -f docker/docker-compose.yml up -d

# Voir les logs
docker-compose -f docker/docker-compose.yml logs -f
```

### Migrations

```bash
# Exécuter les migrations
docker-compose -f docker/docker-compose.yml exec api npm run migrate
```

Voir [DEPLOYMENT.md](DEPLOYMENT.md) pour le guide complet de déploiement production.

**Déploiement sur Contabo VPS:** Consultez [DEPLOY_CONTABO.md](DEPLOY_CONTABO.md) pour un guide spécifique avec nettoyage automatique de l'environnement existant.

**Configuration pour ReplyPro:** Si votre backend est sur `replypro.cm` et votre API sur `api-wa.replypro.cm`, consultez [DEPLOY_REPLYPRO.md](DEPLOY_REPLYPRO.md) pour une configuration prête à l'emploi.

## 📚 Documentation API

Une fois l'application démarrée, accédez à la documentation Swagger:
- `http://localhost:3000/api-docs`

## 🔐 Authentification

Toutes les routes (sauf `/instances` (POST) et `/health`) nécessitent un header:
```
X-API-Key: wapi_your_api_key_here
```

**Important**: Les API keys sont hashées en base de données pour la sécurité. L'API key n'est retournée qu'une seule fois lors de la création de l'instance.

## 🔒 Sécurité

- **API keys hashées** (SHA-256) en base de données
- **Signatures HMAC** sur tous les webhooks
- **Protection SSRF** pour les médias (whitelist de domaines)
- **Rate limiting** multi-niveaux (IP + API key + endpoint)
- **Logs redaction** automatique (pas de secrets dans les logs)
- **HTTPS obligatoire** en production
- **CORS strict** (pas de wildcard)

Voir [SECURITY.md](SECURITY.md) pour plus de détails.

## 📖 Exemples d'utilisation

Voir `DCD_FONCTIONNEL.md` pour des exemples détaillés et la documentation complète de l'API.

## 🔄 Routes uniformisées

Les routes suivent maintenant une convention REST cohérente:

- `POST /api/v1/instances` - Créer instance
- `GET /api/v1/instances/:id` - Détails instance
- `POST /api/v1/instances/:id/connect` - Connecter
- `GET /api/v1/groups` - Lister groupes
- `POST /api/v1/groups` - Créer groupe
- `GET /api/v1/groups/:groupId` - Détails groupe

Les anciennes routes sont toujours supportées pour compatibilité mais sont dépréciées.

## 🏗️ Architecture

```
Nginx (SSL) → Node.js API → PostgreSQL + Redis
```

## 📝 License

MIT

