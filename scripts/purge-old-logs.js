const pool = require('../src/config/database');
const logger = require('../src/utils/logger');

/**
 * Script de purge des logs webhooks anciens (> 30 jours)
 * À exécuter via cron job quotidien
 */
async function purgeOldLogs() {
  const retentionDays = parseInt(process.env.WEBHOOK_LOG_RETENTION_DAYS || '30', 10);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  try {
    logger.info(`Purging webhook logs older than ${retentionDays} days (before ${cutoffDate.toISOString()})`);
    
    const result = await pool.query(
      'DELETE FROM webhook_logs WHERE created_at < $1 RETURNING id',
      [cutoffDate]
    );
    
    const deletedCount = result.rowCount;
    logger.info(`Purged ${deletedCount} webhook log entries`);
    
    // Optionnel: VACUUM pour récupérer l'espace
    if (deletedCount > 0) {
      await pool.query('VACUUM ANALYZE webhook_logs');
      logger.info('VACUUM completed');
    }
    
    return deletedCount;
  } catch (error) {
    logger.error('Error purging old logs:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  purgeOldLogs()
    .then((count) => {
      logger.info(`Purge completed: ${count} logs deleted`);
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Purge script failed:', error);
      process.exit(1);
    });
}

module.exports = { purgeOldLogs };

