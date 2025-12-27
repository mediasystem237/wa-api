const crypto = require('crypto');
const logger = require('../utils/logger');
const ErrorFormatter = require('../utils/errorFormatter');

/**
 * Middleware pour générer un request_id unique par requête
 */
function requestIdMiddleware(req, res, next) {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
}

/**
 * Middleware de gestion des erreurs avec format standardisé
 */
function errorHandler(err, req, res, next) {
  logger.error({
    request_id: req.id,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    origin: req.headers.origin,
    status: err.status || 500
  }, 'Error occurred');
  
  // Erreur CORS
  if (err.message && err.message.includes('Not allowed by CORS')) {
    return res.status(403).json(
      ErrorFormatter.format({
        code: 'CORS_ERROR',
        message: 'Not allowed by CORS',
        status: 403
      }, req)
    );
  }
  
  // Erreur de validation
  if (err.name === 'ValidationError') {
    return res.status(400).json(
      ErrorFormatter.format({
        code: ErrorFormatter.codes.VALIDATION_ERROR,
        message: err.message
      }, req, err.details)
    );
  }
  
  // Erreur de connexion WhatsApp
  if (err.message && err.message.includes('not connected')) {
    return res.status(424).json(
      ErrorFormatter.format({
        code: ErrorFormatter.codes.INSTANCE_NOT_CONNECTED,
        message: 'Instance is not connected to WhatsApp',
        status: 424
      }, req, { currentStatus: 'disconnected' })
    );
  }
  
  // Erreur de numéro invalide
  if (err.message && err.message.includes('Invalid phone number')) {
    return res.status(400).json(
      ErrorFormatter.format({
        code: ErrorFormatter.codes.INVALID_PHONE_NUMBER,
        message: 'Invalid phone number format',
        status: 400
      }, req)
    );
  }
  
  // Erreur de média
  if (err.message && err.message.includes('Media size') || err.message.includes('Media URL')) {
    return res.status(413).json(
      ErrorFormatter.format({
        code: ErrorFormatter.codes.MEDIA_TOO_LARGE,
        message: err.message,
        status: 413
      }, req)
    );
  }
  
  // Erreur avec code personnalisé
  if (err.code && err.status) {
    return res.status(err.status).json(
      ErrorFormatter.format(err, req, err.details)
    );
  }
  
  // Erreur par défaut
  res.status(err.status || 500).json(
    ErrorFormatter.format({
      code: ErrorFormatter.codes.INTERNAL_ERROR,
      message: err.message || 'An unexpected error occurred',
      status: err.status || 500
    }, req)
  );
}

/**
 * Middleware pour les routes non trouvées
 */
function notFoundHandler(req, res) {
  res.status(404).json(
    ErrorFormatter.format({
      code: ErrorFormatter.codes.ROUTE_NOT_FOUND,
      message: `Route ${req.method} ${req.path} not found`,
      status: 404
    }, req)
  );
}

module.exports = {
  requestIdMiddleware,
  errorHandler,
  notFoundHandler
};

