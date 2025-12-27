const crypto = require('crypto');

/**
 * Format d'erreur standard pour toutes les réponses d'erreur
 */
class ErrorFormatter {
  /**
   * Génère un format d'erreur standardisé
   */
  static format(error, req = null, details = null) {
    const requestId = req ? (req.id || crypto.randomUUID()) : crypto.randomUUID();
    
    // Si l'erreur a déjà le bon format, la retourner
    if (error.error && error.code && error.request_id) {
      return error;
    }
    
    const formatted = {
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred',
        ...(details && { details }),
        request_id: requestId
      }
    };
    
    // En développement, ajouter la stack
    if (process.env.NODE_ENV === 'development' && error.stack) {
      formatted.error.stack = error.stack;
    }
    
    return formatted;
  }
  
  /**
   * Crée une erreur avec le format standard
   */
  static create(code, message, status = 500, details = null) {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    error.details = details;
    return error;
  }
  
  /**
   * Codes d'erreur standardisés
   */
  static codes = {
    // 400 - Bad Request
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_PHONE_NUMBER: 'INVALID_PHONE_NUMBER',
    INVALID_PARAMETERS: 'INVALID_PARAMETERS',
    MEDIA_URL_INVALID: 'MEDIA_URL_INVALID',
    
    // 401 - Unauthorized
    API_KEY_MISSING: 'API_KEY_MISSING',
    ADMIN_KEY_MISSING: 'ADMIN_KEY_MISSING',
    
    // 403 - Forbidden
    INVALID_API_KEY: 'INVALID_API_KEY',
    INVALID_ADMIN_KEY: 'INVALID_ADMIN_KEY',
    FORBIDDEN: 'FORBIDDEN',
    
    // 404 - Not Found
    INSTANCE_NOT_FOUND: 'INSTANCE_NOT_FOUND',
    ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
    GROUP_NOT_FOUND: 'GROUP_NOT_FOUND',
    
    // 409 - Conflict
    INSTANCE_ALREADY_EXISTS: 'INSTANCE_ALREADY_EXISTS',
    INSTANCE_ALREADY_CONNECTING: 'INSTANCE_ALREADY_CONNECTING',
    
    // 413 - Payload Too Large
    MEDIA_TOO_LARGE: 'MEDIA_TOO_LARGE',
    
    // 422 - Unprocessable Entity
    UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
    
    // 424 - Failed Dependency
    INSTANCE_NOT_CONNECTED: 'INSTANCE_NOT_CONNECTED',
    
    // 429 - Too Many Requests
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    
    // 500 - Internal Server Error
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    WEBHOOK_ERROR: 'WEBHOOK_ERROR',
    CONNECTION_ERROR: 'CONNECTION_ERROR'
  };
}

module.exports = ErrorFormatter;

