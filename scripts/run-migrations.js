const fs = require('fs').promises;
const path = require('path');
const pool = require('../src/config/database');
const logger = require('../src/utils/logger');

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const migrationFiles = (await fs.readdir(migrationsDir))
    .filter(file => file.endsWith('.sql'))
    .sort();

  logger.info(`Found ${migrationFiles.length} migration files`);

  // Les migrations DOIVENT être exécutées séquentiellement (ordre important)
  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = await fs.readFile(filePath, 'utf8');

    logger.info(`Running migration: ${file}`);
    
    try {
      await pool.query(sql);
      logger.info(`✓ Migration ${file} completed successfully`);
    } catch (error) {
      if (error.code === '42P07' || error.message.includes('already exists')) {
        logger.warn(`⚠ Migration ${file} already applied (skipping)`);
      } else {
        logger.error(`✗ Migration ${file} failed:`, error);
        throw error;
      }
    }
  }

  logger.info('All migrations completed');
  await pool.end();
  process.exit(0);
}

runMigrations().catch(error => {
  logger.error('Migration script failed:', error);
  process.exit(1);
});

