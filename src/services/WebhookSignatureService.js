const crypto = require('crypto');
const logger = require('../utils/logger');

class WebhookSignatureService {
  static TIMESTAMP_TOLERANCE = 300; // 5 minutes en secondes
  
  /**
   * Génère une signature HMAC-SHA256 pour un payload
   */
  static sign(payload, secret, timestamp) {
    if (!secret) {
      throw new Error('Webhook secret is required');
    }
    
    const timestampStr = timestamp ? timestamp.toString() : Date.now().toString();
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const message = `${timestampStr}.${payloadString}`;
    
    const signature = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');
    
    return `sha256=${signature}`;
  }
  
  /**
   * Vérifie une signature HMAC
   */
  static verify(signature, payload, secret, timestamp) {
    if (!signature || !secret) {
      return false;
    }
    
    // Valider le timestamp d'abord
    if (!this.validateTimestamp(timestamp)) {
      logger.warn('Webhook timestamp validation failed');
      return false;
    }
    
    // Extraire la signature du header (format: sha256=...)
    const signatureMatch = signature.match(/^sha256=(.+)$/);
    if (!signatureMatch) {
      return false;
    }
    
    const receivedSignature = signatureMatch[1];
    
    // Calculer la signature attendue
    const expectedSignature = this.sign(payload, secret, timestamp);
    const expectedSignatureValue = expectedSignature.replace('sha256=', '');
    
    // Comparaison constant-time
    try {
      return crypto.timingSafeEqual(
        Buffer.from(receivedSignature, 'hex'),
        Buffer.from(expectedSignatureValue, 'hex')
      );
    } catch (error) {
      logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }
  
  /**
   * Valide que le timestamp est dans la fenêtre de tolérance
   */
  static validateTimestamp(timestamp) {
    if (!timestamp) {
      return false;
    }
    
    const timestampNum = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
    const now = Date.now();
    const diff = Math.abs(now - timestampNum) / 1000; // Différence en secondes
    
    return diff <= this.TIMESTAMP_TOLERANCE;
  }
  
  /**
   * Génère les headers de signature pour un webhook
   */
  static generateHeaders(payload, secret) {
    const timestamp = Date.now();
    const signature = this.sign(payload, secret, timestamp);
    
    return {
      'X-Signature': signature,
      'X-Webhook-Timestamp': timestamp.toString()
    };
  }
}

module.exports = WebhookSignatureService;

