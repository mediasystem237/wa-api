const { createClient } = require('redis');
const config = require('./env');
const logger = require('../utils/logger');

const client = createClient({
  url: config.redis.url
});

client.on('error', (err) => {
  logger.error('Redis Client Error', err);
});

client.on('connect', () => {
  logger.info('Redis connected successfully');
});

// Connect on module load
client.connect().catch((err) => {
  logger.error('Redis connection failed:', err);
});

module.exports = client;

