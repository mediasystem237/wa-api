require('dotenv').config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'whatsapp_api',
    user: process.env.DB_USER || 'whatsapp',
    password: process.env.DB_PASSWORD || 'postgres'
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  
  security: {
    adminKey: process.env.ADMIN_KEY || ''
  },
  
  cors: {
    origins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()) : []
  },
  
  media: {
    urlWhitelist: process.env.MEDIA_URL_WHITELIST ? process.env.MEDIA_URL_WHITELIST.split(',').map(d => d.trim()) : []
  },
  
  webhooks: {
    timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '10000', 10),
    retryAttempts: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.WEBHOOK_RETRY_DELAY || '1000', 10)
  },
  
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10)
  },
  
  baileys: {
    logLevel: process.env.BAILEYS_LOG_LEVEL || 'silent',
    maxReconnectionAttempts: parseInt(process.env.MAX_RECONNECTION_ATTEMPTS || '3', 10)
  },
  
  domain: process.env.API_DOMAIN || 'api-wa.replypro.cm'
};

