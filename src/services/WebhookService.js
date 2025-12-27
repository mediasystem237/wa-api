const crypto = require('crypto');
const axios = require('axios');
const WebhookLog = require('../models/WebhookLog');
const WebhookSignatureService = require('./WebhookSignatureService');
const config = require('../config/env');
const logger = require('../utils/logger');

class WebhookService {
  /**
   * Envoie un webhook avec retry et signature HMAC
   * @param {Object} config - Configuration du webhook
   * @param {number} config.instanceId - ID de l'instance
   * @param {string} config.webhookUrl - URL du webhook
   * @param {string} config.event - Type d'événement
   * @param {Object} config.data - Données à envoyer
   * @param {Array<string>} [config.webhookEvents=[]] - Liste des événements autorisés
   * @param {string} [config.webhookSecret=null] - Secret pour la signature HMAC
   */
  static async send({ instanceId, webhookUrl, event, data, webhookEvents = [], webhookSecret = null }) {
    // Vérifier si l'événement est dans la liste des événements autorisés
    if (webhookEvents.length > 0 && !webhookEvents.includes(event)) {
      logger.debug(`Event ${event} not in webhook events list, skipping`);
      return;
    }
    
    if (!webhookUrl) {
      logger.debug('No webhook URL configured, skipping');
      return;
    }
    
    const timestamp = Date.now();
    const deliveryId = crypto.randomUUID();
    
    const payload = {
      event,
      instance: data.instance || 'unknown',
      apiKey: data.apiKey || '',
      timestamp,
      deliveryId,
      data: data
    };
    
    const headers = {
      'Content-Type': 'application/json',
      'X-Instance': data.instance || 'unknown',
      'X-Event': event,
      'User-Agent': 'WhatsApp-API/1.0'
    };
    
    // Ajouter signature HMAC si secret disponible
    if (webhookSecret) {
      const signatureHeaders = WebhookSignatureService.generateHeaders(payload, webhookSecret);
      Object.assign(headers, signatureHeaders);
    }
    
    // Retry logic
    const retryResult = await this.executeWebhookRequest({
      webhookUrl,
      payload,
      headers,
      instanceId,
      event,
      deliveryId
    });
    
    if (retryResult.success) {
      return retryResult;
    }
    
    // Tous les essais ont échoué - marquer comme dead-letter
    const finalRetryCount = config.webhooks.retryAttempts;
    await this.logFailedWebhook({
      instanceId,
      event,
      payload,
      statusCode: retryResult.statusCode,
      responseTime: retryResult.responseTime,
      error: retryResult.error,
      retryCount: finalRetryCount,
      deliveryId
    });
    
    logger.error(`Webhook failed after ${finalRetryCount} attempts (dead-letter): ${event} to ${webhookUrl} (deliveryId: ${deliveryId})`);
    
    return { 
      success: false, 
      error: retryResult.error, 
      deliveryId,
      deadLetter: true,
      retryCount: finalRetryCount
    };
  }

  /**
   * Exécute une requête webhook avec retry
   */
  static async executeWebhookRequest({ webhookUrl, payload, headers, instanceId, event, deliveryId }) {
    let lastError = null;
    let lastStatusCode = null;
    let responseTime = null;
    const envConfig = require('../config/env');
    
    for (let attempt = 1; attempt <= envConfig.webhooks.retryAttempts; attempt++) {
      const startTime = Date.now();
      
      try {
        const response = await axios.post(webhookUrl, payload, {
          headers,
          timeout: envConfig.webhooks.timeout,
          validateStatus: () => true
        });
        
        responseTime = Date.now() - startTime;
        lastStatusCode = response.status;
        
        if (response.status >= 200 && response.status < 300) {
          await WebhookLog.create({
            instanceId,
            eventType: event,
            payload,
            statusCode: response.status,
            responseTimeMs: responseTime,
            retryCount: attempt - 1,
            deliveryId
          });
          
          logger.info(`Webhook sent successfully: ${event} to ${webhookUrl} (attempt ${attempt}, deliveryId: ${deliveryId})`);
          return { success: true, statusCode: response.status, responseTime, deliveryId };
        } else {
          lastError = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (error) {
        responseTime = Date.now() - startTime;
        lastError = error.message;
        
        if (error.response) {
          lastStatusCode = error.response.status;
        }
        
        logger.warn(`Webhook attempt ${attempt} failed: ${error.message}`);
      }
      
      if (attempt < envConfig.webhooks.retryAttempts) {
        const delay = envConfig.webhooks.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return { success: false, error: lastError, statusCode: lastStatusCode, responseTime };
  }

  /**
   * Log un webhook en échec
   */
  static async logFailedWebhook({ instanceId, event, payload, statusCode, responseTime, error, retryCount, deliveryId }) {
    await WebhookLog.create({
      instanceId,
      eventType: event,
      payload,
      statusCode,
      responseTimeMs: responseTime,
      error,
      retryCount,
      deliveryId
    });
  }
  
  /**
   * Envoie un webhook de manière asynchrone (fire and forget)
   */
  static async sendAsync(instanceId, webhookUrl, event, data, webhookEvents = [], webhookSecret = null) {
    // Ne pas attendre la réponse - compatibilité avec l'ancienne API
    this.send({ instanceId, webhookUrl, event, data, webhookEvents, webhookSecret }).catch(err => {
      logger.error('Async webhook error:', err);
    });
  }
}

module.exports = WebhookService;

