const pool = require('../src/config/database');
const ApiKeyService = require('../src/services/ApiKeyService');
const logger = require('../src/utils/logger');

/**
 * Script de migration des API keys existantes vers des hash
 * À exécuter une seule fois après la migration 004
 */
async function migrateApiKeys() {
  try {
    logger.info('Starting API keys migration...');
    
    // Récupérer toutes les instances avec api_key en clair
    const result = await pool.query(
      'SELECT id, api_key FROM instances WHERE api_key IS NOT NULL AND api_key_hash IS NULL'
    );
    
    logger.info(`Found ${result.rows.length} instances to migrate`);
    
    let migrated = 0;
    let errors = 0;
    
    for (const instance of result.rows) {
      try {
        const hash = ApiKeyService.hash(instance.api_key);
        const last4 = ApiKeyService.extractLast4(instance.api_key);
        
        await pool.query(
          'UPDATE instances SET api_key_hash = $1, api_key_last4 = $2 WHERE id = $3',
          [hash, last4, instance.id]
        );
        
        migrated++;
        logger.debug(`Migrated instance ${instance.id}`);
      } catch (error) {
        errors++;
        logger.error(`Error migrating instance ${instance.id}:`, error);
      }
    }
    
    logger.info(`Migration completed: ${migrated} migrated, ${errors} errors`);
    
    // Optionnel: Supprimer la colonne api_key après vérification
    // ATTENTION: Ne décommenter que si vous êtes sûr que tous les hash sont corrects
    // await pool.query('ALTER TABLE instances DROP COLUMN api_key');
    
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  migrateApiKeys()
    .then(() => {
      logger.info('Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateApiKeys };

