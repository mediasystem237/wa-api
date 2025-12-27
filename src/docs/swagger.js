/**
 * @openapi
 * /api/v1/instances:
 *   post:
 *     summary: Créer une nouvelle instance WhatsApp
 *     description: Crée une nouvelle instance WhatsApp. L'API key et le webhook secret sont retournés une seule fois - sauvegardez-les !
 *     tags: [Instances]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - instanceName
 *             properties:
 *               instanceName:
 *                 type: string
 *                 example: my-whatsapp-bot
 *               webhookUrl:
 *                 type: string
 *                 format: uri
 *                 example: https://example.com/webhook
 *               webhookEvents:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [message.received, connection.connected]
 *     responses:
 *       '201':
 *         description: Instance créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 instance:
 *                   type: object
 *                 message:
 *                   type: string
 *       '409':
 *         description: Le nom d'instance existe déjà
 *
 *   get:
 *     summary: Récupère le statut d'une instance
 *     description: Récupère le statut et les informations d'une instance WhatsApp
 *     tags: [Instances]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'instance
 *     responses:
 *       '200':
 *         description: Statut de l'instance
 *       '401':
 *         description: API Key manquante
 *       '403':
 *         description: API Key invalide
 *       '404':
 *         description: Instance non trouvée
 */

/**
 * @openapi
 * /api/v1/instances/{id}/connect:
 *   post:
 *     summary: Connecter une instance
 *     description: Démarre la connexion WhatsApp d'une instance. Retourne un QR code si nécessaire.
 *     tags: [Instances]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Connexion démarrée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                 qrCode:
 *                   type: string
 *       '401':
 *         description: API Key manquante
 *       '403':
 *         description: API Key invalide
 */

/**
 * @openapi
 * /api/v1/instances/{id}/disconnect:
 *   post:
 *     summary: Déconnecter une instance
 *     description: Déconnecte une instance WhatsApp
 *     tags: [Instances]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Instance déconnectée
 *       '401':
 *         description: API Key manquante
 */

/**
 * @openapi
 * /api/v1/instances/{id}:
 *   delete:
 *     summary: Supprimer une instance
 *     description: Supprime définitivement une instance et toutes ses données
 *     tags: [Instances]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Instance supprimée
 *       '401':
 *         description: API Key manquante
 */

/**
 * @openapi
 * /api/v1/messages/send:
 *   post:
 *     summary: Envoyer un message texte
 *     description: Envoie un message texte via WhatsApp
 *     tags: [Messages]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *               - text
 *             properties:
 *               to:
 *                 type: string
 *                 example: "33612345678"
 *               text:
 *                 type: string
 *                 example: "Hello from API!"
 *     responses:
 *       '200':
 *         description: Message envoyé
 *       '401':
 *         description: API Key manquante
 */

/**
 * @openapi
 * /api/v1/admin/instances:
 *   get:
 *     summary: Lister toutes les instances (Admin)
 *     description: Récupère la liste de toutes les instances (nécessite une Admin Key)
 *     tags: [Admin]
 *     security:
 *       - AdminKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filtrer par statut
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       '200':
 *         description: Liste des instances
 *       '401':
 *         description: Admin Key manquante
 *       '403':
 *         description: Admin Key invalide
 */

/**
 * @openapi
 * /api/v1/groups:
 *   get:
 *     summary: Lister les groupes
 *     description: Récupère la liste des groupes WhatsApp de l'instance
 *     tags: [Groups]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       '200':
 *         description: Liste des groupes
 *       '401':
 *         description: API Key manquante
 */

/**
 * @openapi
 * /api/v1/check/{phoneNumber}:
 *   get:
 *     summary: Vérifier un numéro de téléphone
 *     description: Vérifie si un numéro de téléphone existe sur WhatsApp
 *     tags: [Contacts]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: phoneNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Numéro de téléphone à vérifier
 *     responses:
 *       '200':
 *         description: Statut du numéro
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 exists:
 *                   type: boolean
 *                 jid:
 *                   type: string
 *                   nullable: true
 */

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     description: Vérifie l'état de l'API
 *     tags: [System]
 *     responses:
 *       '200':
 *         description: API opérationnelle
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 version:
 *                   type: string
 *                 uptime:
 *                   type: integer
 *                 connections:
 *                   type: object
 *                   properties:
 *                     active:
 *                       type: integer
 *                     total:
 *                       type: integer
 */

