import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, query } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getExecutedMigrations(): Promise<string[]> {
  const result = await query<{ name: string }>('SELECT name FROM _migrations ORDER BY id');
  return result.rows.map(row => row.name);
}

async function getMigrationFiles(): Promise<string[]> {
  const files = fs.readdirSync(MIGRATIONS_DIR);
  return files
    .filter(f => f.endsWith('.sql'))
    .sort();
}

async function runMigration(filename: string): Promise<void> {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filepath, 'utf-8');
  
  console.log(`Running migration: ${filename}`);
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [filename]);
    await client.query('COMMIT');
    console.log(`Migration ${filename} completed successfully`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Migration ${filename} failed:`, error);
    throw error;
  } finally {
    client.release();
  }
}

async function migrate(): Promise<void> {
  console.log('Starting database migration...');
  
  await ensureMigrationsTable();
  
  const executed = await getExecutedMigrations();
  const files = await getMigrationFiles();
  
  const pending = files.filter(f => !executed.includes(f));
  
  if (pending.length === 0) {
    console.log('No pending migrations');
    return;
  }
  
  console.log(`Found ${pending.length} pending migration(s)`);
  
  for (const file of pending) {
    await runMigration(file);
  }
  
  console.log('All migrations completed');
}

async function rollback(): Promise<void> {
  console.log('Rollback is not implemented for SQL migrations.');
  console.log('Please manually create a down migration if needed.');
}

// Main execution
const command = process.argv[2];

if (command === 'down') {
  rollback()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
} else {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
