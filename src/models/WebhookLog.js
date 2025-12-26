const pool = require('../config/database');
const logger = require('../utils/logger');

class WebhookLog {
  static async create(data) {
    const { instanceId, eventType, payload, statusCode, responseTimeMs, error, retryCount, deliveryId } = data;
    
    const query = `
      INSERT INTO webhook_logs (instance_id, event_type, payload, status_code, response_time_ms, error, retry_count, delivery_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [
        instanceId,
        eventType,
        JSON.stringify(payload),
        statusCode || null,
        responseTimeMs || null,
        error || null,
        retryCount || 0,
        deliveryId || null
      ]);
      
      const log = result.rows[0];
      log.payload = JSON.parse(log.payload);
      return log;
    } catch (error) {
      logger.error('Error creating webhook log:', error);
      throw error;
    }
  }
  
  static async findByInstance(instanceId, options = {}) {
    const { limit = 100, level } = options;
    
    let query = 'SELECT * FROM webhook_logs WHERE instance_id = $1';
    const params = [instanceId];
    let paramCount = 2;
    
    if (level) {
      if (level === 'error') {
        query += ` AND error IS NOT NULL`;
      } else if (level === 'success') {
        query += ` AND status_code >= 200 AND status_code < 300`;
      }
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
    params.push(limit);
    
    try {
      const result = await pool.query(query, params);
      
      result.rows.forEach(log => {
        log.payload = JSON.parse(log.payload || '{}');
      });
      
      return result.rows;
    } catch (error) {
      logger.error('Error finding webhook logs:', error);
      throw error;
    }
  }
  
  static async getStats(instanceId, hours = 24) {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as success,
        COUNT(CASE WHEN error IS NOT NULL OR status_code >= 400 THEN 1 END) as failed,
        AVG(response_time_ms) as avg_response_time,
        MIN(response_time_ms) as min_response_time,
        MAX(response_time_ms) as max_response_time,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) as median_response_time,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time
      FROM webhook_logs
      WHERE instance_id = $1 AND created_at >= NOW() - INTERVAL '${hours} hours'
    `;
    
    try {
      const result = await pool.query(query, [instanceId]);
      const stats = result.rows[0];
      
      // Calculer le taux de réussite
      stats.success_rate = stats.total > 0 
        ? ((stats.success / stats.total) * 100).toFixed(2)
        : 0;
      
      return stats;
    } catch (error) {
      logger.error('Error getting webhook stats:', error);
      throw error;
    }
  }
  
  /**
   * Récupère les statistiques par type d'événement
   */
  static async getStatsByEvent(instanceId, hours = 24) {
    const query = `
      SELECT 
        event_type,
        COUNT(*) as total,
        COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as success,
        COUNT(CASE WHEN error IS NOT NULL OR status_code >= 400 THEN 1 END) as failed,
        AVG(response_time_ms) as avg_response_time
      FROM webhook_logs
      WHERE instance_id = $1 AND created_at >= NOW() - INTERVAL '${hours} hours'
      GROUP BY event_type
      ORDER BY total DESC
    `;
    
    try {
      const result = await pool.query(query, [instanceId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting webhook stats by event:', error);
      throw error;
    }
  }
  
  /**
   * Récupère les webhooks en échec (dead-letter)
   */
  static async getFailedWebhooks(instanceId, limit = 100) {
    const query = `
      SELECT *
      FROM webhook_logs
      WHERE instance_id = $1 
        AND (error IS NOT NULL OR status_code >= 400)
        AND retry_count >= 3
      ORDER BY created_at DESC
      LIMIT $2
    `;
    
    try {
      const result = await pool.query(query, [instanceId, limit]);
      result.rows.forEach(log => {
        log.payload = JSON.parse(log.payload || '{}');
      });
      return result.rows;
    } catch (error) {
      logger.error('Error getting failed webhooks:', error);
      throw error;
    }
  }
}

module.exports = WebhookLog;

