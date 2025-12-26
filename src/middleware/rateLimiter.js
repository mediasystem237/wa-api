const RateLimitService = require('../services/RateLimitService');
const config = require('../config/env');

/**
 * Configuration des limites par endpoint
 * Format: { limit: nombre, windowMs: millisecondes, byIP: bool, byAPIKey: bool }
 */
const limits = {
  // Instances
  'POST:/api/v1/instances': { limit: 10, windowMs: 3600000, byIP: true, byAPIKey: false }, // 10/heure par IP
  'POST:/api/v1/instances/:id/connect': { limit: 5, windowMs: 3600000, byIP: false, byAPIKey: true }, // 5/heure par instance
  'POST:/api/v1/instances/:id/disconnect': { limit: 10, windowMs: 3600000, byIP: false, byAPIKey: true },
  'POST:/api/v1/instances/:id/restart': { limit: 5, windowMs: 3600000, byIP: false, byAPIKey: true },
  'GET:/api/v1/instances/:id': { limit: 100, windowMs: 60000, byIP: false, byAPIKey: true }, // 100/minute
  
  // Messages
  'POST:/api/v1/messages/send': { limit: 100, windowMs: 60000, byIP: false, byAPIKey: true }, // 100/minute par instance
  'POST:/api/v1/messages/image': { limit: 50, windowMs: 60000, byIP: false, byAPIKey: true },
  'POST:/api/v1/messages/video': { limit: 20, windowMs: 60000, byIP: false, byAPIKey: true },
  'POST:/api/v1/messages/document': { limit: 30, windowMs: 60000, byIP: false, byAPIKey: true },
  'POST:/api/v1/messages/audio': { limit: 30, windowMs: 60000, byIP: false, byAPIKey: true },
  
  // Routes de compatibilité (dépréciées)
  'POST:/api/v1/instance/create': { limit: 10, windowMs: 3600000, byIP: true, byAPIKey: false },
  'POST:/api/v1/instance/connect': { limit: 5, windowMs: 3600000, byIP: false, byAPIKey: true },
  'POST:/api/v1/message/send': { limit: 100, windowMs: 60000, byIP: false, byAPIKey: true },
  'POST:/api/v1/message/image': { limit: 50, windowMs: 60000, byIP: false, byAPIKey: true },
  'POST:/api/v1/message/video': { limit: 20, windowMs: 60000, byIP: false, byAPIKey: true },
  
  // Par défaut
  'default': { limit: 1000, windowMs: 3600000, byIP: true, byAPIKey: false } // 1000/heure par défaut
};

/**
 * Middleware de rate limiting
 */
async function rateLimiter(req, res, next) {
  if (!config.rateLimit.enabled) {
    return next();
  }
  
  const method = req.method;
  let path = req.path;
  
  // Normaliser le path (remplacer les IDs par :id pour matching)
  path = path.replace(/\/\d+/g, '/:id');
  
  const key = `${method}:${path}`;
  
  try {
    const limitConfig = limits[key] || limits['default'];
    const windowMs = limitConfig.windowMs || config.rateLimit.windowMs;
    const limit = limitConfig.limit;
    
    // Rate limit par IP si configuré
    let ipLimit = null;
    if (limitConfig.byIP !== false) {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      ipLimit = await RateLimitService.checkIPLimit(
        ip,
        key,
        limit,
        windowMs
      );
    }
    
    // Rate limit par API key si disponible et configuré
    let apiKeyLimit = null;
    if (limitConfig.byAPIKey && req.instance) {
      // Utiliser l'ID de l'instance plutôt que la clé (plus sûr)
      apiKeyLimit = await RateLimitService.checkInstanceLimit(
        req.instance.id,
        key,
        limit,
        windowMs
      );
    }
    
    // Utiliser la limite la plus restrictive
    let finalLimit = ipLimit;
    if (apiKeyLimit) {
      if (!ipLimit || apiKeyLimit.exceeded || apiKeyLimit.remaining < ipLimit.remaining) {
        finalLimit = apiKeyLimit;
      }
    }
    
    // Si aucune limite n'est configurée, autoriser
    if (!finalLimit) {
      return next();
    }
    
    // Ajouter les headers de rate limit
    res.setHeader('X-RateLimit-Limit', finalLimit.limit);
    res.setHeader('X-RateLimit-Remaining', finalLimit.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(finalLimit.reset).toISOString());
    
    if (finalLimit.exceeded) {
      const ErrorFormatter = require('../utils/errorFormatter');
      return res.status(429).json(
        ErrorFormatter.format({
          code: ErrorFormatter.codes.RATE_LIMIT_EXCEEDED,
          message: 'Too many requests, please try again later',
          status: 429
        }, req, {
          retryAfter: Math.ceil((finalLimit.reset - Date.now()) / 1000),
          limit: finalLimit.limit,
          resetAt: new Date(finalLimit.reset).toISOString()
        })
      );
    }
    
    next();
  } catch (error) {
    // En cas d'erreur, on autorise la requête (fail open)
    const logger = require('../utils/logger');
    logger.error('Rate limiter error:', error);
    next();
  }
}

module.exports = rateLimiter;

