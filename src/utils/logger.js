const pino = require('pino');
const config = require('../config/env');

const logger = pino({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  transport: config.nodeEnv === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname'
    }
  } : undefined,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-api-key"]',
      'req.headers["x-admin-key"]',
      'req.headers.cookie',
      'req.body.password',
      'req.body.apiKey',
      'req.body.webhookSecret',
      '*.apiKey',
      '*.password',
      '*.secret',
      '*.token'
    ],
    remove: true
  }
});

module.exports = logger;

