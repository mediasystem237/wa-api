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

// Health check (avant CORS pour être accessible sans restrictions)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    connections: {
      active: whatsappService.connections.size,
      total: whatsappService.connections.size
    }
  });
});

// CORS configuré (pas de wildcard en prod)
// Placé avant Helmet pour éviter les conflits
const corsOptions = {
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origin (même origine que le serveur - accès direct)
    // Cela permet d'accéder à /api-docs depuis le domaine de l'API lui-même
    if (!origin) {
      return callback(null, true);
    }

    // En développement, autoriser toutes les origines
    if (config.nodeEnv === 'development') {
      return callback(null, true);
    }

    // En production, construire la liste des origines autorisées
    const apiDomain = `https://${config.domain}`;
    const allowedOrigins = process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
      : [];

    // Toujours autoriser le domaine de l'API lui-même
    const allAllowedOrigins = [apiDomain, ...allowedOrigins];

    // Vérifier si l'origin est autorisé
    if (allAllowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn({
        origin: origin,
        allowedOrigins: allAllowedOrigins.join(', ')
      }, 'CORS blocked origin');
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Admin-Key'],
  exposedHeaders: ['X-Request-ID'],
  optionsSuccessStatus: 200 // Pour les navigateurs legacy
};
app.use(cors(corsOptions));

// Configurer Helmet pour ne pas bloquer CORS
const helmetOptions = {
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
};
app.use(helmet(helmetOptions));
app.use(compression());
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
  apis: ['./src/routes/*.js', './src/controllers/*.js', './src/docs/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check déjà défini avant CORS (ligne 30)

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

  // Reconnecter les instances actives au démarrage (en parallèle pour améliorer les performances)
  try {
    const instances = await Instance.findAll({ status: 'connected' });

    // Utiliser Promise.allSettled pour exécuter les reconnexions en parallèle
    const reconnectPromises = instances.map(async (instance) => {
      try {
        await whatsappService.connect({
          instanceId: instance.id,
          instanceName: instance.instance_name,
          webhookUrl: instance.webhook_url,
          apiKey: instance.api_key,
          webhookEvents: instance.webhook_events,
          webhookSecret: instance.webhook_secret
        });
        logger.info(`Reconnected instance: ${instance.instance_name}`);
        return { instance: instance.instance_name, success: true };
      } catch (error) {
        logger.error(`Failed to reconnect instance ${instance.instance_name}:`, error);
        // Mettre à jour le statut en cas d'échec
        await Instance.update(instance.id, { status: 'disconnected' });
        return { instance: instance.instance_name, success: false, error };
      }
    });

    const results = await Promise.allSettled(reconnectPromises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    logger.info(`Reconnection completed: ${successful}/${instances.length} instances reconnected`);
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

