const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./config/env');
const logger = require('./utils/logger');
const { requestIdMiddleware, errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');

// Routes
const instanceRoutes = require('./routes/instance');
const messageRoutes = require('./routes/message');
const groupRoutes = require('./routes/group');
const contactRoutes = require('./routes/contact');
const adminRoutes = require('./routes/admin');

// Services
const whatsappService = require('./services/WhatsAppService');
const Instance = require('./models/Instance');

const app = express();

// Middleware de sécurité
app.use(requestIdMiddleware); // Générer request_id pour chaque requête
app.use(helmet());
app.use(compression());

// CORS configuré (pas de wildcard en prod)
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
      : [];
    
    // En développement, autoriser les requêtes sans origin
    if (config.nodeEnv === 'development' && !origin) {
      return callback(null, true);
    }
    
    // En production, vérifier l'origin
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Admin-Key']
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting global
app.use(rateLimiter);

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WhatsApp API Baileys',
      version: '1.0.0',
      description: 'API REST pour gérer des connexions WhatsApp via Baileys'
    },
    servers: [
      {
        url: `https://${config.domain}`,
        description: 'Production server'
      },
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        },
        AdminKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Admin-Key'
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    connections: {
      active: whatsappService.connections.size,
      total: whatsappService.connections.size
    },
    timestamp: new Date().toISOString()
  });
});

// API Routes (uniformisées)
app.use('/api/v1/instances', instanceRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1', contactRoutes);
app.use('/api/v1/admin', adminRoutes);

// Routes de compatibilité (dépréciées)
app.use('/api/v1/instance', instanceRoutes);
app.use('/api/v1/message', messageRoutes);
app.use('/api/v1/group', groupRoutes);

// Documentation de base
app.get('/', (req, res) => {
  res.json({
    name: 'WhatsApp Connection API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      instances: '/api/v1/instance',
      messages: '/api/v1/message',
      groups: '/api/v1/group',
      contacts: '/api/v1/check',
      admin: '/api/v1/admin',
      health: '/health'
    }
  });
});

// Gestion des erreurs
app.use(notFoundHandler);
app.use(errorHandler);

// Démarrage du serveur
const server = app.listen(config.port, async () => {
  logger.info(`🚀 WhatsApp API started on port ${config.port}`);
  logger.info(`📚 API Documentation: http://localhost:${config.port}/api-docs`);
  
  // Reconnecter les instances actives au démarrage
  try {
    const instances = await Instance.findAll({ status: 'connected' });
    
    for (const instance of instances) {
      try {
        await whatsappService.connect(
          instance.id,
          instance.instance_name,
          instance.webhook_url,
          instance.api_key,
          instance.webhook_events,
          instance.webhook_secret
        );
        logger.info(`Reconnected instance: ${instance.instance_name}`);
      } catch (error) {
        logger.error(`Failed to reconnect instance ${instance.instance_name}:`, error);
        // Mettre à jour le statut en cas d'échec
        await Instance.update(instance.id, { status: 'disconnected' });
      }
    }
  } catch (error) {
    logger.error('Error reconnecting instances:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  
  // Déconnecter toutes les connexions
  for (const [name, connection] of whatsappService.connections) {
    try {
      if (connection.sock) {
        await connection.sock.end();
      }
    } catch (error) {
      logger.error(`Error disconnecting ${name}:`, error);
    }
  }
  
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  
  for (const [name, connection] of whatsappService.connections) {
    try {
      if (connection.sock) {
        await connection.sock.end();
      }
    } catch (error) {
      logger.error(`Error disconnecting ${name}:`, error);
    }
  }
  
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = app;

