# Configuration Spécifique pour ReplyPro

Guide de déploiement rapide pour votre environnement:
- **Backend**: `replypro.cm`
- **API WhatsApp**: `api-wa.replypro.cm`

## 🚀 Déploiement Rapide

### 1. Préparation sur le VPS

```bash
# Se connecter au VPS (vous avez déjà configuré "ssh contabo")
ssh contabo

# Créer le répertoire
mkdir -p /opt/whatsapp-api
cd /opt/whatsapp-api
```

### 2. Transférer les fichiers depuis Windows

**Option A: Avec rsync (recommandé - exclut automatiquement archive/)**

```powershell
# Depuis PowerShell ou Git Bash sur Windows
cd "G:\API WAHATSAPP BAYLEYS"

# Avec rsync (exclut archive, node_modules, etc.)
rsync -avz --exclude='archive' --exclude='node_modules' --exclude='.git' --exclude='sessions' --exclude='logs' --exclude='.env*' ./ contabo:/opt/whatsapp-api/
```

**Option B: Avec scp (transfert manuel, exclure archive manuellement)**

```powershell
# Depuis PowerShell
cd "G:\API WAHATSAPP BAYLEYS"

# Transférer fichier par fichier en excluant archive
# Ou utiliser un script qui filtre les fichiers
Get-ChildItem -Exclude archive,node_modules,.git,sessions,logs,.env* | ForEach-Object {
    scp -r $_.Name contabo:/opt/whatsapp-api/
}
```

**Option C: Utiliser le script de transfert (si rsync disponible)**

```bash
# Depuis Git Bash ou WSL
cd "G:/API WAHATSAPP BAYLEYS"
chmod +x scripts/transfer-to-vps.sh
./scripts/transfer-to-vps.sh contabo
```

### 3. Configuration de l'environnement

```bash
# Sur le VPS
cd /opt/whatsapp-api

# Copier le fichier de configuration
cp .env.contabo .env

# Générer un mot de passe fort pour la base de données
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
sed -i "s/CHANGEZ_MOI_AVEC_UN_MOT_DE_PASSE_FORT_123!/${DB_PASSWORD}/" .env

# Générer une clé admin sécurisée
ADMIN_KEY="admin_$(openssl rand -hex 32)"
sed -i "s/admin_CHANGEZ_MOI_AVEC_UNE_CLE_ALEATOIRE_64_CARACTERES/${ADMIN_KEY}/" .env

# Afficher la clé admin (IMPORTANT: Notez-la!)
echo "=========================================="
echo "VOTRE ADMIN_KEY: ${ADMIN_KEY}"
echo "=========================================="
echo "Notez cette clé, vous en aurez besoin!"

# Sécuriser le fichier .env
chmod 600 .env
```

### 4. Nettoyage et déploiement Docker

```bash
# Arrêter les anciens conteneurs
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true

# Créer les répertoires nécessaires
mkdir -p sessions logs
chmod 755 sessions logs

# Démarrer les services
docker-compose -f docker/docker-compose.yml up -d --build

# Attendre le démarrage (30 secondes)
sleep 30

# Vérifier le statut
docker-compose -f docker/docker-compose.yml ps

# Exécuter les migrations
docker-compose -f docker/docker-compose.yml exec -T api npm run migrate

# Tester l'API
curl http://localhost:3000/health
```

### 5. Configuration Nginx

```bash
# Copier la configuration Nginx
sudo cp docker/nginx/nginx-contabo.conf /etc/nginx/sites-available/api-wa.replypro.cm

# Activer le site
sudo ln -s /etc/nginx/sites-available/api-wa.replypro.cm /etc/nginx/sites-enabled/

# Supprimer la config par défaut (optionnel)
sudo rm -f /etc/nginx/sites-enabled/default

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

### 6. Obtenir le certificat SSL

```bash
# Obtenir le certificat Let's Encrypt
sudo certbot --nginx -d api-wa.replypro.cm

# Certbot va automatiquement:
# - Obtenir le certificat
# - Configurer SSL dans Nginx
# - Configurer le renouvellement automatique

# Vérifier le renouvellement
sudo certbot renew --dry-run
```

### 7. Vérification finale

```bash
# Test de santé
curl https://api-wa.replypro.cm/health

# Test de création d'instance (remplacez YOUR_ADMIN_KEY)
curl -X POST https://api-wa.replypro.cm/api/v1/instances \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  -d '{
    "instanceName": "test-instance",
    "webhookUrl": "https://replypro.cm/webhook/whatsapp"
  }'
```

## 📝 Configuration des Webhooks

Quand vous créez une instance, utilisez l'URL de votre backend:

```json
{
  "instanceName": "mon-instance",
  "webhookUrl": "https://replypro.cm/api/webhooks/whatsapp"
}
```

L'API enverra les événements WhatsApp à cette URL avec une signature HMAC.

## 🔐 Vérification de la signature webhook

Sur votre backend `replypro.cm`, vous devez vérifier la signature HMAC:

```javascript
// Exemple Node.js
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, timestamp, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', '')),
    Buffer.from(expectedSignature)
  );
}

// Dans votre route webhook
app.post('/api/webhooks/whatsapp', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const secret = 'votre-webhook-secret'; // Récupéré depuis l'instance
  
  const payload = JSON.stringify(req.body);
  
  if (!verifyWebhookSignature(payload, signature, timestamp, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Vérifier l'anti-replay (timestamp pas trop vieux)
  const now = Date.now();
  if (Math.abs(now - parseInt(timestamp)) > 300000) { // 5 minutes
    return res.status(401).json({ error: 'Timestamp too old' });
  }
  
  // Traiter le webhook
  console.log('Webhook reçu:', req.body);
  res.json({ received: true });
});
```

## 🔄 Commandes utiles

### Voir les logs
```bash
docker-compose -f docker/docker-compose.yml logs -f api
```

### Redémarrer l'API
```bash
docker-compose -f docker/docker-compose.yml restart api
```

### Voir les instances
```bash
curl -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  https://api-wa.replypro.cm/api/v1/admin/instances
```

### Créer une instance
```bash
curl -X POST https://api-wa.replypro.cm/api/v1/instances \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  -d '{
    "instanceName": "production",
    "webhookUrl": "https://replypro.cm/api/webhooks/whatsapp"
  }'
```

## 🐛 Dépannage

### L'API ne répond pas
```bash
# Vérifier les logs
docker-compose -f docker/docker-compose.yml logs api

# Vérifier que le conteneur tourne
docker-compose -f docker/docker-compose.yml ps

# Redémarrer
docker-compose -f docker/docker-compose.yml restart api
```

### Erreur SSL
```bash
# Vérifier le certificat
sudo certbot certificates

# Renouveler manuellement
sudo certbot renew
```

### Webhooks ne fonctionnent pas
```bash
# Vérifier les logs webhooks
curl -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  https://api-wa.replypro.cm/api/v1/admin/instance/INSTANCE_NAME/logs
```

## 📊 Monitoring

```bash
# Utilisation des ressources
docker stats

# Logs Nginx
sudo tail -f /var/log/nginx/api-wa-replypro-access.log
sudo tail -f /var/log/nginx/api-wa-replypro-error.log
```

## ✅ Checklist finale

- [ ] Fichier `.env` configuré avec mot de passe fort
- [ ] ADMIN_KEY généré et noté
- [ ] Conteneurs Docker démarrés
- [ ] Migrations exécutées
- [ ] Nginx configuré
- [ ] Certificat SSL obtenu
- [ ] Test `/health` fonctionne
- [ ] Test création d'instance fonctionne
- [ ] Webhooks configurés sur `replypro.cm`

## 🔗 URLs importantes

- **API Health**: `https://api-wa.replypro.cm/health`
- **API Documentation**: `https://api-wa.replypro.cm/api/v1/docs` (si disponible)
- **Backend**: `https://replypro.cm`

