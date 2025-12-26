const redis = require('../config/redis');
const logger = require('../utils/logger');

class ConnectionLockService {
  static LOCK_TTL = 300; // 5 minutes en secondes
  static LOCK_PREFIX = 'lock:instance:';
  
  /**
   * Acquiert un lock pour une instance
   */
  static async acquire(instanceName) {
    const lockKey = `${this.LOCK_PREFIX}${instanceName}`;
    
    try {
      // Essayer d'acquérir le lock avec SET NX (set if not exists)
      const result = await redis.set(lockKey, 'locked', {
        EX: this.LOCK_TTL,
        NX: true
      });
      
      if (result === 'OK') {
        logger.debug(`Lock acquired for instance: ${instanceName}`);
        return true;
      }
      
      // Lock déjà existant
      logger.warn(`Lock already exists for instance: ${instanceName}`);
      return false;
    } catch (error) {
      logger.error(`Error acquiring lock for ${instanceName}:`, error);
      // En cas d'erreur Redis, on autorise (fail open)
      return true;
    }
  }
  
  /**
   * Libère un lock pour une instance
   */
  static async release(instanceName) {
    const lockKey = `${this.LOCK_PREFIX}${instanceName}`;
    
    try {
      await redis.del(lockKey);
      logger.debug(`Lock released for instance: ${instanceName}`);
      return true;
    } catch (error) {
      logger.error(`Error releasing lock for ${instanceName}:`, error);
      return false;
    }
  }
  
  /**
   * Vérifie si une instance a un lock actif
   */
  static async isLocked(instanceName) {
    const lockKey = `${this.LOCK_PREFIX}${instanceName}`;
    
    try {
      const exists = await redis.exists(lockKey);
      return exists === 1;
    } catch (error) {
      logger.error(`Error checking lock for ${instanceName}:`, error);
      // En cas d'erreur, on considère comme non-locked (fail open)
      return false;
    }
  }
  
  /**
   * Prolonge un lock existant
   */
  static async extend(instanceName) {
    const lockKey = `${this.LOCK_PREFIX}${instanceName}`;
    
    try {
      const exists = await redis.exists(lockKey);
      if (exists === 1) {
        await redis.expire(lockKey, this.LOCK_TTL);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error extending lock for ${instanceName}:`, error);
      return false;
    }
  }
}

module.exports = ConnectionLockService;

