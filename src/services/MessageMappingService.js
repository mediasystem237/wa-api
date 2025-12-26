const redis = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Service pour mapper les IDs de messages (interne → WhatsApp)
 * Utilise Redis pour stocker temporairement les mappings
 */
class MessageMappingService {
  static TTL = 86400; // 24 heures
  static PREFIX = 'msgmap:';
  
  /**
   * Stocke le mapping entre un ID interne et un ID WhatsApp
   */
  static async storeMapping(instanceId, internalId, whatsappId) {
    const key = `${this.PREFIX}${instanceId}:${internalId}`;
    try {
      await redis.setex(key, this.TTL, whatsappId);
      logger.debug(`Stored message mapping: ${internalId} → ${whatsappId}`);
    } catch (error) {
      logger.error('Error storing message mapping:', error);
    }
  }
  
  /**
   * Récupère l'ID WhatsApp à partir d'un ID interne
   */
  static async getWhatsAppId(instanceId, internalId) {
    const key = `${this.PREFIX}${instanceId}:${internalId}`;
    try {
      const whatsappId = await redis.get(key);
      return whatsappId;
    } catch (error) {
      logger.error('Error getting message mapping:', error);
      return null;
    }
  }
  
  /**
   * Stocke l'ACK d'un message
   */
  static async storeAck(instanceId, whatsappId, ack) {
    const key = `${this.PREFIX}ack:${instanceId}:${whatsappId}`;
    try {
      await redis.setex(key, this.TTL, JSON.stringify({
        ack,
        timestamp: Date.now()
      }));
    } catch (error) {
      logger.error('Error storing message ack:', error);
    }
  }
  
  /**
   * Récupère l'ACK d'un message
   */
  static async getAck(instanceId, whatsappId) {
    const key = `${this.PREFIX}ack:${instanceId}:${whatsappId}`;
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Error getting message ack:', error);
      return null;
    }
  }
  
  /**
   * Nettoie les mappings expirés (optionnel, Redis le fait automatiquement)
   */
  static async cleanup(instanceId) {
    // Redis gère automatiquement l'expiration via TTL
    // Cette méthode peut être utilisée pour forcer un cleanup si nécessaire
    logger.debug(`Cleanup not needed for instance ${instanceId} (Redis TTL handles it)`);
  }
}

module.exports = MessageMappingService;

