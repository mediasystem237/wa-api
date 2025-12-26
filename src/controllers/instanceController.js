const Instance = require('../models/Instance');
const ApiKeyService = require('../services/ApiKeyService');
const whatsappService = require('../services/WhatsAppService');
const logger = require('../utils/logger');

class InstanceController {
  /**
   * Crée une nouvelle instance
   */
  static async create(req, res, next) {
    try {
      const { instanceName, webhookUrl, webhookEvents } = req.body;
      
      // Générer API key et son hash
      const { apiKey, hash: apiKeyHash, last4: apiKeyLast4 } = ApiKeyService.generate();
      
      // Générer secret webhook
      const webhookSecret = ApiKeyService.generateWebhookSecret();
      
      // Créer l'instance
      const instance = await Instance.create({
        instanceName,
        apiKey,
        apiKeyHash,
        apiKeyLast4,
        webhookUrl: webhookUrl || null,
        webhookSecret,
        webhookEvents: webhookEvents || ['message.received']
      });
      
      res.status(201).json({
        success: true,
        instance: {
          id: instance.id,
          name: instance.instance_name,
          apiKey: instance.api_key, // Retourné une seule fois lors de la création
          apiKeyLast4: instance.api_key_last4,
          webhookUrl: instance.webhook_url,
          webhookSecret: instance.webhook_secret, // Retourné une seule fois
          webhookEvents: instance.webhook_events,
          status: instance.status,
          createdAt: instance.created_at
        },
        message: 'Instance created successfully. Save your API key and webhook secret - they will not be shown again.'
      });
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(409).json({
          error: 'Conflict',
          message: 'Instance name already exists',
          code: 'INSTANCE_ALREADY_EXISTS'
        });
      }
      next(error);
    }
  }
  
  /**
   * Connecte une instance
   */
  static async connect(req, res, next) {
    try {
      const { id, instance_name, webhook_url, api_key, webhook_events, webhook_secret } = req.instance;
      
      // Vérifier si déjà connecté
      const existingStatus = whatsappService.getStatus(instance_name);
      if (existingStatus.status === 'connected') {
        return res.json({
          success: true,
          status: 'connected',
          message: 'Instance already connected'
        });
      }
      
      // Connecter
      const { status, connection } = await whatsappService.connect(
        id,
        instance_name,
        webhook_url,
        api_key,
        webhook_events,
        webhook_secret
      );
      
      // Attendre le QR code si nécessaire
      let qrCode = null;
      if (status === 'qr_ready') {
        // Récupérer le QR depuis la BDD
        const instance = await Instance.findById(id);
        qrCode = instance.qr_code;
      }
      
      res.json({
        success: true,
        status,
        qrCode,
        message: status === 'qr_ready' 
          ? 'Scan the QR code with WhatsApp' 
          : 'Connection in progress',
        webhookEvents: webhook_events
      });
    } catch (error) {
      const ErrorFormatter = require('../utils/errorFormatter');
      if (error.message && error.message.includes('already being connected')) {
        return res.status(409).json(
          ErrorFormatter.format({
            code: ErrorFormatter.codes.INSTANCE_ALREADY_CONNECTING,
            message: error.message,
            status: 409
          }, req)
        );
      }
      next(error);
    }
  }
  
  /**
   * Récupère le statut d'une instance
   */
  static async getStatus(req, res, next) {
    try {
      // Support des routes avec ID dans l'URL
      const instanceId = req.params.id ? parseInt(req.params.id, 10) : null;
      let instance;
      
      if (instanceId && req.instance && req.instance.id !== instanceId) {
        // Si un ID est fourni et différent de l'instance authentifiée, chercher par ID
        instance = await Instance.findById(instanceId);
        const ErrorFormatter = require('../utils/errorFormatter');
        if (!instance) {
          return res.status(404).json(
            ErrorFormatter.format({
              code: ErrorFormatter.codes.INSTANCE_NOT_FOUND,
              message: 'Instance not found',
              status: 404
            }, req)
          );
        }
      } else {
        instance = req.instance;
      }
      
      const { id, instance_name } = instance;
      
      // Récupérer depuis la BDD
      const dbInstance = await Instance.findById(id);
      const ErrorFormatter = require('../utils/errorFormatter');
      if (!dbInstance) {
        return res.status(404).json(
          ErrorFormatter.format({
            code: ErrorFormatter.codes.INSTANCE_NOT_FOUND,
            message: 'Instance not found',
            status: 404
          }, req)
        );
      }
      
      // Récupérer le statut de la connexion
      const connectionStatus = whatsappService.getStatus(instance_name);
      
      // Calculer l'uptime
      let uptime = null;
      if (dbInstance.connected_at) {
        uptime = Math.floor((Date.now() - new Date(dbInstance.connected_at).getTime()) / 1000);
      }
      
      res.json({
        instance: instance_name,
        status: connectionStatus.status || dbInstance.status,
        connected: connectionStatus.connected || dbInstance.status === 'connected',
        phoneNumber: dbInstance.phone_number,
        phoneName: dbInstance.phone_name,
        qrCode: dbInstance.status === 'qr_ready' ? dbInstance.qr_code : null,
        connectedAt: dbInstance.connected_at,
        lastDisconnectReason: dbInstance.disconnect_reason,
        createdAt: dbInstance.created_at,
        uptime
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Déconnecte une instance
   */
  static async disconnect(req, res, next) {
    try {
      const { instance_name, id } = req.instance;
      
      await whatsappService.disconnect(instance_name);
      
      res.json({
        success: true,
        message: 'Instance disconnected successfully',
        disconnectedAt: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Redémarre une instance
   */
  static async restart(req, res, next) {
    try {
      const { instance_name, id } = req.instance;
      
      await whatsappService.restart(instance_name);
      
      // Réinitialiser les tentatives de reconnexion
      await Instance.update(id, {
        status: 'connecting',
        disconnect_reason: null
      });
      
      res.json({
        success: true,
        message: 'Instance restarting...',
        newStatus: 'connecting'
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Reset la session d'une instance (supprime les fichiers de session)
   */
  static async resetSession(req, res, next) {
    try {
      const { instance_name, id } = req.instance;
      
      await whatsappService.resetSession(instance_name);
      
      // Mettre à jour le statut en base
      await Instance.update(id, {
        status: 'created',
        qr_code: null,
        qr_expires_at: null,
        connected_at: null,
        disconnected_at: new Date(),
        disconnect_reason: 'session_reset'
      });
      
      res.json({
        success: true,
        message: 'Session reset successfully. You need to reconnect to generate a new QR code.',
        status: 'created'
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Supprime une instance
   */
  static async delete(req, res, next) {
    try {
      const { instance_name, id } = req.instance;
      const fs = require('fs').promises;
      const path = require('path');
      
      // Déconnecter si connecté
      try {
        await whatsappService.disconnect(instance_name);
      } catch (error) {
        // Ignorer les erreurs de déconnexion
      }
      
      // Supprimer de la BDD
      await Instance.delete(id);
      
      // Supprimer les fichiers de session
      const sessionPath = path.join(process.cwd(), 'sessions', instance_name);
      try {
        await fs.rm(sessionPath, { recursive: true, force: true });
      } catch (error) {
        logger.warn(`Could not delete session directory: ${error.message}`);
      }
      
      res.json({
        success: true,
        message: 'Instance deleted permanently',
        deletedAt: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Met à jour le webhook
   */
  static async updateWebhook(req, res, next) {
    try {
      const { id } = req.instance;
      const { webhookUrl, webhookEvents } = req.body;
      
      const updateData = {};
      if (webhookUrl !== undefined) {
        updateData.webhook_url = webhookUrl || null;
        // Générer un nouveau secret si l'URL change
        if (webhookUrl) {
          updateData.webhook_secret = ApiKeyService.generateWebhookSecret();
        }
      }
      if (webhookEvents !== undefined) {
        updateData.webhook_events = webhookEvents;
      }
      
      const instance = await Instance.update(id, updateData);
      
      // Mettre à jour la connexion si elle existe
      const connection = whatsappService.connections.get(req.instance.instance_name);
      if (connection) {
        connection.webhookUrl = instance.webhook_url;
        connection.webhookEvents = instance.webhook_events;
        if (instance.webhook_secret) {
          connection.webhookSecret = instance.webhook_secret;
        }
      }
      
      res.json({
        success: true,
        webhookUrl: instance.webhook_url,
        webhookEvents: instance.webhook_events,
        message: 'Webhook updated successfully',
        updatedAt: instance.updated_at
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = InstanceController;
