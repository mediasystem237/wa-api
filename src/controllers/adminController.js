const Instance = require('../models/Instance');
const WebhookLog = require('../models/WebhookLog');
const whatsappService = require('../services/WhatsAppService');
const logger = require('../utils/logger');
const ErrorFormatter = require('../utils/errorFormatter');

class AdminController {
  static async listInstances(req, res, next) {
    try {
      const { status, page = 1, limit = 50, sort = 'created_at', order = 'desc' } = req.query;
      
      const instances = await Instance.findAll({
        status,
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        sort,
        order
      });
      
      const total = await Instance.count({ status });
      const totalPages = Math.ceil(total / parseInt(limit));
      
      // Statistiques
      const summary = {
        total: await Instance.count({}),
        connected: await Instance.count({ status: 'connected' }),
        disconnected: await Instance.count({ status: 'disconnected' }),
        error: await Instance.count({ status: 'error' })
      };
      
      res.json({
        success: true,
        instances: instances.map(inst => ({
          id: inst.id,
          name: inst.instance_name,
          status: inst.status,
          phoneNumber: inst.phone_number,
          phoneName: inst.phone_name,
          connectedAt: inst.connected_at,
          createdAt: inst.created_at,
          lastActivity: inst.updated_at
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages
        },
        summary
      });
    } catch (error) {
      next(error);
    }
  }
  
  static async getMetrics(req, res, next) {
    try {
      const { hours = 24 } = req.query;
      
      // Statistiques globales
      const totalInstances = await Instance.count({});
      const connectedInstances = await Instance.count({ status: 'connected' });
      
      // Statistiques webhooks (toutes instances)
      // Note: getStats nécessite un instanceId, on va faire une requête globale
      const allWebhookStats = await WebhookLog.getStats(null, parseInt(hours));
      
      res.json({
        instances: {
          total: totalInstances,
          connected: connectedInstances,
          disconnected: totalInstances - connectedInstances
        },
        webhooks: {
          total: allWebhookStats.total || 0,
          success: allWebhookStats.success || 0,
          failed: allWebhookStats.failed || 0,
          successRate: allWebhookStats.success_rate || '0.00',
          avgResponseTime: allWebhookStats.avg_response_time || 0,
          p95ResponseTime: allWebhookStats.p95_response_time || 0
        },
        period: `${hours} hours`
      });
    } catch (error) {
      next(error);
    }
  }
  
  static async getInstanceMetrics(req, res, next) {
    try {
      const { name } = req.params;
      const { hours = 24 } = req.query;
      
      const instance = await Instance.findByName(name);
      if (!instance) {
        return res.status(404).json(
          ErrorFormatter.format({
            code: ErrorFormatter.codes.INSTANCE_NOT_FOUND,
            message: 'Instance not found',
            status: 404
          }, req)
        );
      }
      
      // Statistiques webhooks
      const stats = await WebhookLog.getStats(instance.id, parseInt(hours));
      const statsByEvent = await WebhookLog.getStatsByEvent(instance.id, parseInt(hours));
      
      res.json({
        instance: {
          id: instance.id,
          name: instance.instance_name,
          status: instance.status
        },
        stats: {
          ...stats,
          byEvent: statsByEvent
        },
        period: `${hours} hours`
      });
    } catch (error) {
      next(error);
    }
  }
  
  static async getInstanceLogs(req, res, next) {
    try {
      const { name } = req.params;
      const { limit = 100, level, hours = 24 } = req.query;
      
      const instance = await Instance.findByName(name);
      if (!instance) {
        return res.status(404).json(
          ErrorFormatter.format({
            code: ErrorFormatter.codes.INSTANCE_NOT_FOUND,
            message: 'Instance not found',
            status: 404
          }, req)
        );
      }
      
      // Statistiques webhooks
      const stats = await WebhookLog.getStats(instance.id, parseInt(hours));
      const statsByEvent = await WebhookLog.getStatsByEvent(instance.id, parseInt(hours));
      
      // Logs récents
      const logs = await WebhookLog.findByInstance(instance.id, {
        limit: Math.min(parseInt(limit), 1000),
        level
      });
      
      // Dead-letters (webhooks en échec après tous les retries)
      const deadLetters = await WebhookLog.getFailedWebhooks(instance.id, 50);
      
      res.json({
        instance: {
          id: instance.id,
          name: instance.instance_name,
          status: instance.status
        },
        stats: {
          ...stats,
          byEvent: statsByEvent
        },
        logs: logs.map(log => ({
          timestamp: log.created_at,
          deliveryId: log.delivery_id,
          level: log.error ? 'error' : 'success',
          event: log.event_type,
          meta: {
            statusCode: log.status_code,
            responseTime: log.response_time_ms,
            error: log.error,
            retryCount: log.retry_count
          }
        })),
        deadLetters: deadLetters.map(log => ({
          timestamp: log.created_at,
          deliveryId: log.delivery_id,
          event: log.event_type,
          error: log.error,
          statusCode: log.status_code,
          retryCount: log.retry_count
        })),
        period: `${hours} hours`
      });
    } catch (error) {
      next(error);
    }
  }
  
  static async cleanup(req, res, next) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      let cleanedSessions = 0;
      let cleanedQRCodes = 0;
      
      // Nettoyer les QR codes expirés
      const instances = await Instance.findAll({ status: 'qr_ready' });
      const now = new Date();
      
      for (const instance of instances) {
        if (instance.qr_expires_at && new Date(instance.qr_expires_at) < now) {
          await Instance.update(instance.id, {
            qr_code: null,
            qr_expires_at: null,
            status: 'disconnected'
          });
          cleanedQRCodes++;
        }
      }
      
      // Nettoyer les sessions orphelines (instances supprimées mais sessions restantes)
      const sessionsPath = path.join(process.cwd(), 'sessions');
      try {
        const sessionDirs = await fs.readdir(sessionsPath);
        
        for (const dir of sessionDirs) {
          const instance = await Instance.findByName(dir);
          if (!instance) {
            // Instance n'existe plus, supprimer la session
            await fs.rm(path.join(sessionsPath, dir), { recursive: true, force: true });
            cleanedSessions++;
          }
        }
      } catch (error) {
        // Dossier sessions n'existe pas encore
      }
      
      res.json({
        success: true,
        cleaned: {
          sessions: cleanedSessions,
          qrCodes: cleanedQRCodes
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminController;
