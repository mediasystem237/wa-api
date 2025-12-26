const redis = require('../config/redis');
const logger = require('../utils/logger');
const config = require('../config/env');

class RateLimitService {
  /**
   * Vérifie et incrémente le compteur de rate limit
   */
  static async checkLimit(key, limit, windowMs) {
    try {
      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }
      
      const ttl = await redis.ttl(key);
      const resetTime = Date.now() + (ttl * 1000);
      
      return {
        limit,
        remaining: Math.max(0, limit - current),
        reset: resetTime,
        exceeded: current > limit
      };
    } catch (error) {
      logger.error('Rate limit check error:', error);
      // En cas d'erreur Redis, on autorise la requête
      return {
        limit,
        remaining: limit,
        reset: Date.now() + windowMs,
        exceeded: false
      };
    }
  }
  
  /**
   * Rate limit par IP
   */
  static async checkIPLimit(ip, endpoint, limit, windowMs) {
    const key = `ratelimit:ip:${ip}:${endpoint}`;
    return await this.checkLimit(key, limit, windowMs);
  }
  
  /**
   * Rate limit par API key
   */
  static async checkAPIKeyLimit(apiKey, endpoint, limit, windowMs) {
    const key = `ratelimit:apikey:${apiKey}:${endpoint}`;
    return await this.checkLimit(key, limit, windowMs);
  }
  
  /**
   * Rate limit par instance
   */
  static async checkInstanceLimit(instanceId, endpoint, limit, windowMs) {
    const key = `ratelimit:instance:${instanceId}:${endpoint}`;
    return await this.checkLimit(key, limit, windowMs);
  }
  
  /**
   * Réinitialise un rate limit
   */
  static async resetLimit(key) {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error('Rate limit reset error:', error);
    }
  }
}

module.exports = RateLimitService;

