const pool = require('../config/database');
const logger = require('../utils/logger');

class Instance {
  static async create(data) {
    const { instanceName, apiKey, webhookUrl, webhookEvents } = data;
    
    const query = `
      INSERT INTO instances (instance_name, api_key, webhook_url, webhook_events, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'created', NOW(), NOW())
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [
        instanceName,
        apiKey,
        webhookUrl || null,
        JSON.stringify(webhookEvents || ['message.received'])
      ]);
      
      const instance = result.rows[0];
      instance.webhook_events = JSON.parse(instance.webhook_events);
      return instance;
    } catch (error) {
      logger.error('Error creating instance:', error);
      throw error;
    }
  }
  
  static async findByApiKey(apiKey) {
    // Méthode de compatibilité (dépréciée, utiliser findByApiKeyHash)
    const ApiKeyService = require('../services/ApiKeyService');
    const hash = ApiKeyService.hash(apiKey);
    return await this.findByApiKeyHash(hash);
  }
  
  static async findByApiKeyHash(apiKeyHash) {
    const query = 'SELECT * FROM instances WHERE api_key_hash = $1';
    try {
      const result = await pool.query(query, [apiKeyHash]);
      if (result.rows.length === 0) return null;
      
      const instance = result.rows[0];
      instance.webhook_events = JSON.parse(instance.webhook_events || '[]');
      return instance;
    } catch (error) {
      logger.error('Error finding instance by API key hash:', error);
      throw error;
    }
  }
  
  static async findById(id) {
    const query = 'SELECT * FROM instances WHERE id = $1';
    try {
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) return null;
      
      const instance = result.rows[0];
      instance.webhook_events = JSON.parse(instance.webhook_events || '[]');
      return instance;
    } catch (error) {
      logger.error('Error finding instance by ID:', error);
      throw error;
    }
  }
  
  static async findByName(name) {
    const query = 'SELECT * FROM instances WHERE instance_name = $1';
    try {
      const result = await pool.query(query, [name]);
      if (result.rows.length === 0) return null;
      
      const instance = result.rows[0];
      instance.webhook_events = JSON.parse(instance.webhook_events || '[]');
      return instance;
    } catch (error) {
      logger.error('Error finding instance by name:', error);
      throw error;
    }
  }
  
  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    Object.keys(data).forEach(key => {
      if (key === 'webhook_events' && Array.isArray(data[key])) {
        fields.push(`${key} = $${paramCount}`);
        values.push(JSON.stringify(data[key]));
      } else {
        fields.push(`${key} = $${paramCount}`);
        values.push(data[key]);
      }
      paramCount++;
    });
    
    fields.push('updated_at = NOW()');
    values.push(id);
    
    const query = `
      UPDATE instances 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, values);
      if (result.rows.length === 0) return null;
      
      const instance = result.rows[0];
      instance.webhook_events = JSON.parse(instance.webhook_events || '[]');
      return instance;
    } catch (error) {
      logger.error('Error updating instance:', error);
      throw error;
    }
  }
  
  static async delete(id) {
    const query = 'DELETE FROM instances WHERE id = $1 RETURNING *';
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error deleting instance:', error);
      throw error;
    }
  }
  
  static async findAll(options = {}) {
    const { status, page = 1, limit = 50, sort = 'created_at', order = 'desc' } = options;
    
    let query = 'SELECT * FROM instances';
    const params = [];
    let paramCount = 1;
    
    if (status) {
      query += ` WHERE status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    query += ` ORDER BY ${sort} ${order.toUpperCase()}`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, (page - 1) * limit);
    
    try {
      const result = await pool.query(query, params);
      
      // Parse webhook_events for each instance
      result.rows.forEach(instance => {
        instance.webhook_events = JSON.parse(instance.webhook_events || '[]');
      });
      
      return result.rows;
    } catch (error) {
      logger.error('Error finding all instances:', error);
      throw error;
    }
  }
  
  static async count(options = {}) {
    const { status } = options;
    
    let query = 'SELECT COUNT(*) as total FROM instances';
    const params = [];
    
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    
    try {
      const result = await pool.query(query, params);
      return parseInt(result.rows[0].total, 10);
    } catch (error) {
      logger.error('Error counting instances:', error);
      throw error;
    }
  }
}

module.exports = Instance;

