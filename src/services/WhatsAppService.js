const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const fs = require('fs').promises;
const path = require('path');
const Instance = require('../models/Instance');
const WebhookService = require('./WebhookService');
const ConnectionLockService = require('./ConnectionLockService');
const config = require('../config/env');
const baileysConfig = require('../config/baileys');
const logger = require('../utils/logger');
const { generateQRImage } = require('../utils/qrGenerator');

class WhatsAppService {
  constructor() {
    this.connections = new Map(); // Map<instanceName, connection>
  }
  
  /**
   * Crée ou récupère une connexion WhatsApp
   */
  async connect(instanceId, instanceName, webhookUrl, apiKey, webhookEvents = [], webhookSecret = null) {
    // Vérifier le lock (une seule connexion active par instance)
    const isLocked = await ConnectionLockService.isLocked(instanceName);
    if (isLocked && !this.connections.has(instanceName)) {
      throw new Error(`Instance ${instanceName} is already being connected by another process`);
    }
    
    // Vérifier si déjà connecté
    if (this.connections.has(instanceName)) {
      const conn = this.connections.get(instanceName);
      if (conn.status === 'connected') {
        return { status: 'connected', connection: conn };
      }
    }
    
    // Acquérir le lock
    const lockAcquired = await ConnectionLockService.acquire(instanceName);
    if (!lockAcquired) {
      throw new Error(`Failed to acquire lock for instance ${instanceName}`);
    }
    
    const authPath = path.join(process.cwd(), 'sessions', instanceName);
    
    // Créer le dossier de session s'il n'existe pas
    try {
      await fs.mkdir(authPath, { recursive: true });
    } catch (error) {
      logger.error(`Error creating session directory: ${error.message}`);
    }
    
    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    
    // Récupérer la version la plus récente de Baileys
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: baileysConfig.printQRInTerminal,
      logger: logger.child({ instance: instanceName }),
      browser: baileysConfig.browser,
      connectTimeoutMs: baileysConfig.connectTimeoutMs,
      defaultQueryTimeoutMs: baileysConfig.defaultQueryTimeoutMs,
      keepAliveIntervalMs: baileysConfig.keepAliveIntervalMs
    });
    
    const connection = {
      instanceId,
      instanceName,
      webhookUrl,
      webhookSecret: webhookSecret || null,
      apiKey,
      webhookEvents,
      sock,
      status: 'connecting',
      qr: null,
      reconnectAttempts: 0
    };
    
    this.connections.set(instanceName, connection);
    
    // Gestion des événements de connexion
    sock.ev.on('connection.update', async (update) => {
      await this.handleConnectionUpdate(connection, update);
    });
    
    // Sauvegarder les credentials
    sock.ev.on('creds.update', saveCreds);
    
    // Gestion des messages reçus
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type === 'notify') {
        await this.handleMessages(connection, messages);
      }
    });
    
    // Gestion des accusés de réception
    sock.ev.on('messages.update', async (updates) => {
      await this.handleMessageUpdates(connection, updates);
    });
    
    // Gestion des groupes
    sock.ev.on('groups.update', async (updates) => {
      await this.handleGroupUpdates(connection, updates);
    });
    
    return { status: connection.status, connection };
  }
  
  /**
   * Gère les mises à jour de connexion
   */
  async handleConnectionUpdate(connection, update) {
    const { connection: connStatus, lastDisconnect, qr } = update;
    
    // QR Code généré
    if (qr) {
      connection.qr = qr;
      connection.status = 'qr_ready';
      
      try {
        const qrImage = await generateQRImage(qr);
        const qrExpiresAt = new Date(Date.now() + 60000); // 60 secondes
        
        await Instance.update(connection.instanceId, {
          status: 'qr_ready',
          qr_code: qrImage,
          qr_expires_at: qrExpiresAt
        });
        
        // Webhook QR généré
        await WebhookService.sendAsync(
          connection.instanceId,
          connection.webhookUrl,
          'qr.generated',
          {
            instance: connection.instanceName,
            apiKey: connection.apiKey,
            qr,
            qrImage,
            expiresAt: qrExpiresAt.toISOString()
          },
          connection.webhookEvents,
          connection.webhookSecret
        );
        
        logger.info(`[${connection.instanceName}] QR code generated`);
      } catch (error) {
        logger.error(`[${connection.instanceName}] Error handling QR:`, error);
      }
    }
    
    // Connexion ouverte
    if (connStatus === 'open') {
      connection.status = 'connected';
      connection.reconnectAttempts = 0;
      
      const user = connection.sock.user;
      const phoneNumber = user.id.split(':')[0];
      const phoneName = user.name || user.notify || phoneNumber;
      
      try {
        await Instance.update(connection.instanceId, {
          status: 'connected',
          phone_number: phoneNumber,
          phone_name: phoneName,
          qr_code: null,
          qr_expires_at: null,
          connected_at: new Date(),
          platform: user.platform || 'unknown'
        });
        
        // Webhook connexion réussie
        await WebhookService.sendAsync(
          connection.instanceId,
          connection.webhookUrl,
          'connection.connected',
          {
            instance: connection.instanceName,
            apiKey: connection.apiKey,
            phoneNumber,
            phoneName,
            platform: user.platform
          },
          connection.webhookEvents,
          connection.webhookSecret
        );
        
        logger.info(`[${connection.instanceName}] Connected: ${phoneNumber}`);
      } catch (error) {
        logger.error(`[${connection.instanceName}] Error handling connection:`, error);
      }
    }
    
    // Connexion fermée
    if (connStatus === 'close') {
      connection.status = 'disconnected';
      
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      const reason = lastDisconnect?.error?.message || 'Unknown';
      
      try {
        await Instance.update(connection.instanceId, {
          status: 'disconnected',
          disconnected_at: new Date(),
          disconnect_reason: reason
        });
        
        // Webhook déconnexion
        await WebhookService.sendAsync(
          connection.instanceId,
          connection.webhookUrl,
          'connection.disconnected',
          {
            instance: connection.instanceName,
            apiKey: connection.apiKey,
            reason,
            shouldReconnect
          },
          connection.webhookEvents
        );
        
        logger.warn(`[${connection.instanceName}] Disconnected: ${reason}`);
        
        // Tentative de reconnexion automatique
        if (shouldReconnect && connection.reconnectAttempts < config.baileys.maxReconnectionAttempts) {
          connection.reconnectAttempts++;
          const delay = Math.min(5000 * connection.reconnectAttempts, 30000);
          
          logger.info(`[${connection.instanceName}] Reconnecting in ${delay}ms (attempt ${connection.reconnectAttempts})`);
          
          setTimeout(async () => {
            try {
              await this.connect(
                connection.instanceId,
                connection.instanceName,
                connection.webhookUrl,
                connection.apiKey,
                connection.webhookEvents
              );
            } catch (error) {
              logger.error(`[${connection.instanceName}] Reconnection failed:`, error);
            }
          }, delay);
        } else {
          // Supprimer la connexion si on ne peut plus se reconnecter
          this.connections.delete(connection.instanceName);
        }
      } catch (error) {
        logger.error(`[${connection.instanceName}] Error handling disconnection:`, error);
      }
    }
  }
  
  /**
   * Gère les messages reçus
   */
  async handleMessages(connection, messages) {
    for (const msg of messages) {
      // Ignorer nos propres messages
      if (!msg.message || msg.key.fromMe) continue;
      
      const from = msg.key.remoteJid;
      const messageType = Object.keys(msg.message)[0];
      
      // Extraire le texte
      let text = null;
      if (msg.message.conversation) {
        text = msg.message.conversation;
      } else if (msg.message.extendedTextMessage) {
        text = msg.message.extendedTextMessage.text;
      }
      
      // Extraire le caption pour les médias
      let caption = null;
      if (msg.message.imageMessage) {
        caption = msg.message.imageMessage.caption;
      } else if (msg.message.videoMessage) {
        caption = msg.message.videoMessage.caption;
      } else if (msg.message.documentMessage) {
        caption = msg.message.documentMessage.caption;
      }
      
      const isGroup = from.endsWith('@g.us');
      const participant = isGroup ? msg.key.participant : null;
      
      const payload = {
        instance: connection.instanceName,
        apiKey: connection.apiKey,
        messageId: msg.key.id,
        from,
        fromName: msg.pushName || null,
        participant,
        timestamp: msg.messageTimestamp,
        messageType,
        isGroup,
        groupId: isGroup ? from : null,
        text: text || caption,
        caption,
        raw: msg.message
      };
      
      // Webhook message reçu
      await WebhookService.sendAsync(
        connection.instanceId,
        connection.webhookUrl,
        'message.received',
        payload,
        connection.webhookEvents,
        connection.webhookSecret
      );
      
      logger.info(`[${connection.instanceName}] Message received from ${from}: ${(text || caption || '').substring(0, 50)}`);
    }
  }
  
  /**
   * Gère les mises à jour de messages (ACK)
   */
  async handleMessageUpdates(connection, updates) {
    for (const update of updates) {
      if (update.update) {
        const ack = update.update.status;
        if (ack) {
          await WebhookService.sendAsync(
            connection.instanceId,
            connection.webhookUrl,
            'message.ack',
            {
              instance: connection.instanceName,
              apiKey: connection.apiKey,
              messageId: update.key.id,
              ack: ack,
              timestamp: Date.now()
            },
            connection.webhookEvents,
            connection.webhookSecret
          );
        }
      }
    }
  }
  
  /**
   * Gère les mises à jour de groupes
   */
  async handleGroupUpdates(connection, updates) {
    for (const update of updates) {
      await WebhookService.sendAsync(
        connection.instanceId,
        connection.webhookUrl,
        'group.update',
        {
          instance: connection.instanceName,
          apiKey: connection.apiKey,
          groupId: update.id,
          action: update.action || 'update',
          participants: update.participants || [],
          subject: update.subject || null
        },
        connection.webhookEvents,
        connection.webhookSecret
      );
    }
  }
  
  /**
   * Déconnecte une instance
   */
  async disconnect(instanceName) {
    const connection = this.connections.get(instanceName);
    if (!connection || !connection.sock) {
      return { success: false, message: 'Not connected' };
    }
    
    try {
      await connection.sock.logout();
      this.connections.delete(instanceName);
      
      // Libérer le lock
      await ConnectionLockService.release(instanceName);
      
      await Instance.update(connection.instanceId, {
        status: 'disconnected',
        disconnected_at: new Date(),
        disconnect_reason: 'manual'
      });
      
      return { success: true, message: 'Disconnected successfully' };
    } catch (error) {
      logger.error(`[${instanceName}] Error disconnecting:`, error);
      // Libérer le lock même en cas d'erreur
      await ConnectionLockService.release(instanceName);
      throw error;
    }
  }
  
  /**
   * Redémarre une connexion
   */
  async restart(instanceName) {
    const connection = this.connections.get(instanceName);
    if (!connection) {
      return { success: false, message: 'Connection not found' };
    }
    
    try {
      // Déconnecter proprement
      if (connection.sock) {
        await connection.sock.end();
      }
      
      this.connections.delete(instanceName);
      
      // Libérer le lock
      await ConnectionLockService.release(instanceName);
      
      // Réinitialiser les tentatives de reconnexion
      await Instance.update(connection.instanceId, {
        status: 'connecting',
        disconnect_reason: null
      });
      
      // Recréer la connexion
      await this.connect(
        connection.instanceId,
        connection.instanceName,
        connection.webhookUrl,
        connection.apiKey,
        connection.webhookEvents,
        connection.webhookSecret
      );
      
      return { success: true, message: 'Restarted successfully' };
    } catch (error) {
      logger.error(`[${instanceName}] Error restarting:`, error);
      // Libérer le lock même en cas d'erreur
      await ConnectionLockService.release(instanceName);
      throw error;
    }
  }
  
  /**
   * Récupère le statut d'une connexion
   */
  getStatus(instanceName) {
    const connection = this.connections.get(instanceName);
    if (!connection) {
      return { status: 'disconnected', connected: false };
    }
    
    return {
      status: connection.status,
      connected: connection.status === 'connected',
      qr: connection.qr
    };
  }
  
  /**
   * Récupère la socket d'une connexion
   */
  getSocket(instanceName) {
    const connection = this.connections.get(instanceName);
    if (!connection || connection.status !== 'connected') {
      return null;
    }
    return connection.sock;
  }
  
  /**
   * Reset la session d'une instance (supprime les fichiers de session)
   */
  async resetSession(instanceName) {
    const connection = this.connections.get(instanceName);
    
    // Déconnecter si connecté
    if (connection && connection.sock) {
      try {
        await connection.sock.end();
      } catch (error) {
        logger.warn(`[${instanceName}] Error ending socket during reset:`, error);
      }
    }
    
    // Supprimer de la map
    this.connections.delete(instanceName);
    
    // Libérer le lock
    await ConnectionLockService.release(instanceName);
    
    // Supprimer les fichiers de session
    const authPath = path.join(process.cwd(), 'sessions', instanceName);
    try {
      await fs.rm(authPath, { recursive: true, force: true });
      logger.info(`[${instanceName}] Session reset: files deleted`);
      return { success: true, message: 'Session reset successfully' };
    } catch (error) {
      logger.error(`[${instanceName}] Error deleting session files:`, error);
      throw new Error(`Failed to reset session: ${error.message}`);
    }
  }
}

// Singleton
const whatsappService = new WhatsAppService();

module.exports = whatsappService;

