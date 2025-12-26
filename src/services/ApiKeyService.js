const crypto = require('crypto');
const logger = require('../utils/logger');

class ApiKeyService {
  /**
   * Génère une nouvelle API key et son hash
   */
  static generate() {
    const apiKey = `wapi_${crypto.randomBytes(32).toString('hex')}`;
    const hash = this.hash(apiKey);
    const last4 = this.extractLast4(apiKey);
    
    return {
      apiKey,
      hash,
      last4
    };
  }
  
  /**
   * Hash une API key avec SHA-256
   */
  static hash(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }
  
  /**
   * Vérifie une API key contre un hash (constant-time)
   */
  static verify(apiKey, hash) {
    if (!apiKey || !hash) {
      return false;
    }
    
    const computedHash = this.hash(apiKey);
    
    // Comparaison constant-time pour éviter les timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, 'hex'),
      Buffer.from(hash, 'hex')
    );
  }
  
  /**
   * Extrait les 4 derniers caractères pour affichage
   */
  static extractLast4(apiKey) {
    if (!apiKey || apiKey.length < 4) {
      return null;
    }
    
    return apiKey.slice(-4);
  }
  
  /**
   * Génère un secret webhook
   */
  static generateWebhookSecret() {
    return crypto.randomBytes(32).toString('hex');
  }
}

module.exports = ApiKeyService;

