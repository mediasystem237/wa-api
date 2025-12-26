const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const WebhookLog = require('../models/WebhookLog');
const WebhookSignatureService = require('./WebhookSignatureService');
const config = require('../config/env');
const logger = require('../utils/logger');

class WebhookService {
  /**
   * Envoie un webhook avec retry et signature HMAC
   */
  static async send(instanceId, webhookUrl, event, data, webhookEvents = [], webhookSecret = null) {
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
    const deliveryId = uuidv4();
    
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
    
    let lastError = null;
    let lastStatusCode = null;
    let responseTime = null;
    
    // Retry logic
    for (let attempt = 1; attempt <= config.webhooks.retryAttempts; attempt++) {
      const startTime = Date.now();
      
      try {
        const response = await axios.post(webhookUrl, payload, {
          headers,
          timeout: config.webhooks.timeout,
          validateStatus: () => true // Accepter tous les codes de statut
        });
        
        responseTime = Date.now() - startTime;
        lastStatusCode = response.status;
        
        if (response.status >= 200 && response.status < 300) {
          // Succès
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
      
      // Attendre avant le prochain essai (backoff exponentiel)
      if (attempt < config.webhooks.retryAttempts) {
        const delay = config.webhooks.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Tous les essais ont échoué - marquer comme dead-letter
    const finalRetryCount = config.webhooks.retryAttempts;
    await WebhookLog.create({
      instanceId,
      eventType: event,
      payload,
      statusCode: lastStatusCode,
      responseTimeMs: responseTime,
      error: lastError,
      retryCount: finalRetryCount,
      deliveryId
    });
    
    logger.error(`Webhook failed after ${finalRetryCount} attempts (dead-letter): ${event} to ${webhookUrl} (deliveryId: ${deliveryId})`);
    
    // Optionnel: envoyer une alerte ou notification pour les dead-letters
    // (peut être implémenté plus tard avec un système de notifications)
    
    return { 
      success: false, 
      error: lastError, 
      deliveryId,
      deadLetter: true,
      retryCount: finalRetryCount
    };
  }
  
  /**
   * Envoie un webhook de manière asynchrone (fire and forget)
   */
  static async sendAsync(instanceId, webhookUrl, event, data, webhookEvents = [], webhookSecret = null) {
    // Ne pas attendre la réponse
    this.send(instanceId, webhookUrl, event, data, webhookEvents, webhookSecret).catch(err => {
      logger.error('Async webhook error:', err);
    });
  }
}

module.exports = WebhookService;

