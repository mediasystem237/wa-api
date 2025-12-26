const { body, validationResult, param } = require('express-validator');

/**
 * Middleware de validation des résultats
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid input data',
      code: 'VALIDATION_ERROR',
      errors: errors.array()
    });
  }
  next();
}

/**
 * Validateurs pour les instances
 */
const instanceValidators = {
  create: [
    body('instanceName')
      .trim()
      .isLength({ min: 3, max: 50 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('instanceName must be 3-50 alphanumeric characters, dashes and underscores only'),
    body('webhookUrl')
      .optional()
      .isURL({ protocols: ['https'], require_protocol: true })
      .withMessage('webhookUrl must be a valid HTTPS URL'),
    body('webhookEvents')
      .optional()
      .isArray()
      .withMessage('webhookEvents must be an array'),
    validate
  ],
  
  updateWebhook: [
    body('webhookUrl')
      .optional()
      .isURL({ protocols: ['https'], require_protocol: true })
      .withMessage('webhookUrl must be a valid HTTPS URL'),
    body('webhookEvents')
      .optional()
      .isArray()
      .withMessage('webhookEvents must be an array'),
    validate
  ]
};

/**
 * Validateurs pour les messages
 */
const messageValidators = {
  send: [
    body('to')
      .trim()
      .notEmpty()
      .withMessage('to is required'),
    body('text')
      .trim()
      .isLength({ min: 1, max: 4096 })
      .withMessage('text must be 1-4096 characters'),
    validate
  ],
  
  image: [
    body('to')
      .trim()
      .notEmpty()
      .withMessage('to is required'),
    body('imageUrl')
      .isURL({ protocols: ['https'], require_protocol: true })
      .withMessage('imageUrl must be a valid HTTPS URL'),
    body('caption')
      .optional()
      .trim()
      .isLength({ max: 1024 })
      .withMessage('caption must be max 1024 characters'),
    validate
  ],
  
  video: [
    body('to')
      .trim()
      .notEmpty()
      .withMessage('to is required'),
    body('videoUrl')
      .isURL({ protocols: ['https'], require_protocol: true })
      .withMessage('videoUrl must be a valid HTTPS URL'),
    body('caption')
      .optional()
      .trim()
      .isLength({ max: 1024 })
      .withMessage('caption must be max 1024 characters'),
    validate
  ],
  
  document: [
    body('to')
      .trim()
      .notEmpty()
      .withMessage('to is required'),
    body('documentUrl')
      .isURL({ protocols: ['https'], require_protocol: true })
      .withMessage('documentUrl must be a valid HTTPS URL'),
    body('filename')
      .trim()
      .notEmpty()
      .withMessage('filename is required'),
    validate
  ],
  
  audio: [
    body('to')
      .trim()
      .notEmpty()
      .withMessage('to is required'),
    body('audioUrl')
      .isURL({ protocols: ['https'], require_protocol: true })
      .withMessage('audioUrl must be a valid HTTPS URL'),
    validate
  ],
  
  location: [
    body('to')
      .trim()
      .notEmpty()
      .withMessage('to is required'),
    body('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('latitude must be between -90 and 90'),
    body('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('longitude must be between -180 and 180'),
    validate
  ],
  
  contact: [
    body('to')
      .trim()
      .notEmpty()
      .withMessage('to is required'),
    body('contacts')
      .isArray({ min: 1, max: 5 })
      .withMessage('contacts must be an array with 1-5 items'),
    body('contacts.*.fullName')
      .trim()
      .notEmpty()
      .withMessage('fullName is required for each contact'),
    body('contacts.*.phoneNumber')
      .trim()
      .notEmpty()
      .withMessage('phoneNumber is required for each contact'),
    validate
  ],
  
  react: [
    body('messageId')
      .trim()
      .notEmpty()
      .withMessage('messageId is required'),
    body('emoji')
      .trim()
      .notEmpty()
      .withMessage('emoji is required'),
    validate
  ],
  
  reply: [
    body('to')
      .trim()
      .notEmpty()
      .withMessage('to is required'),
    body('text')
      .trim()
      .isLength({ min: 1, max: 4096 })
      .withMessage('text must be 1-4096 characters'),
    body('quotedMessageId')
      .trim()
      .notEmpty()
      .withMessage('quotedMessageId is required'),
    validate
  ]
};

/**
 * Validateurs pour les groupes
 */
const groupValidators = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('name must be 1-100 characters'),
    body('participants')
      .isArray({ min: 1 })
      .withMessage('participants must be an array with at least 1 item'),
    validate
  ],
  
  participants: [
    body('participants')
      .isArray({ min: 1 })
      .withMessage('participants must be an array with at least 1 item'),
    validate
  ],
  
  groupId: [
    param('groupId')
      .trim()
      .notEmpty()
      .withMessage('groupId is required'),
    validate
  ]
};

/**
 * Validateurs pour les contacts
 */
const contactValidators = {
  phoneNumber: [
    param('phoneNumber')
      .trim()
      .notEmpty()
      .withMessage('phoneNumber is required'),
    validate
  ],
  
  jid: [
    param('jid')
      .trim()
      .notEmpty()
      .withMessage('jid is required'),
    validate
  ]
};

module.exports = {
  instanceValidators,
  messageValidators,
  groupValidators,
  contactValidators,
  validate
};

