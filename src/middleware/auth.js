const Instance = require('../models/Instance');
const ApiKeyService = require('../services/ApiKeyService');
const logger = require('../utils/logger');

/**
 * Middleware d'authentification par API key
 * Utilise le hash pour vérifier la clé (sécurité renforcée)
 */
async function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  const ErrorFormatter = require('../utils/errorFormatter');
  
  if (!apiKey) {
    return res.status(401).json(
      ErrorFormatter.format({
        code: ErrorFormatter.codes.API_KEY_MISSING,
        message: 'X-API-Key header is required',
        status: 401
      }, req)
    );
  }
  
  try {
    // Calculer le hash de la clé fournie
    const apiKeyHash = ApiKeyService.hash(apiKey);
    
    // Rechercher l'instance par hash
    const instance = await Instance.findByApiKeyHash(apiKeyHash);
    
    if (!instance) {
      return res.status(403).json(
        ErrorFormatter.format({
          code: ErrorFormatter.codes.INVALID_API_KEY,
          message: 'Invalid API key',
          status: 403
        }, req)
      );
    }
    
    // Vérifier la clé avec comparaison constant-time
    if (!ApiKeyService.verify(apiKey, instance.api_key_hash)) {
      return res.status(403).json(
        ErrorFormatter.format({
          code: ErrorFormatter.codes.INVALID_API_KEY,
          message: 'Invalid API key',
          status: 403
        }, req)
      );
    }
    
    // Vérifier la clé avec comparaison constant-time
    if (!ApiKeyService.verify(apiKey, instance.api_key_hash)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid API key',
        code: 'INVALID_API_KEY'
      });
    }
    
    // Injecter l'instance dans la requête
    req.instance = instance;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    const ErrorFormatter = require('../utils/errorFormatter');
    res.status(500).json(
      ErrorFormatter.format({
        code: ErrorFormatter.codes.INTERNAL_ERROR,
        message: 'Authentication failed',
        status: 500
      }, req)
    );
  }
}

/**
 * Middleware d'authentification admin
 */
async function authenticateAdmin(req, res, next) {
  const adminKey = req.headers['x-admin-key'];
  const config = require('../config/env');
  
  const ErrorFormatter = require('../utils/errorFormatter');
  
  if (!adminKey) {
    return res.status(401).json(
      ErrorFormatter.format({
        code: ErrorFormatter.codes.ADMIN_KEY_MISSING,
        message: 'X-Admin-Key header is required',
        status: 401
      }, req)
    );
  }
  
  if (adminKey !== config.security.adminKey) {
    return res.status(403).json(
      ErrorFormatter.format({
        code: ErrorFormatter.codes.INVALID_ADMIN_KEY,
        message: 'Invalid admin key',
        status: 403
      }, req)
    );
  }
  
  next();
}

module.exports = {
  authenticateApiKey,
  authenticateAdmin
};

