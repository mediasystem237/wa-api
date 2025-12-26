const config = require('./env');

module.exports = {
  printQRInTerminal: false,
  logger: {
    level: config.baileys.logLevel
  },
  browser: ['WhatsApp API', 'Chrome', '1.0.0'],
  maxReconnectionAttempts: config.baileys.maxReconnectionAttempts,
  connectTimeoutMs: 60000,
  defaultQueryTimeoutMs: 60000,
  keepAliveIntervalMs: 10000
};

