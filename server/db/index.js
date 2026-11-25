import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.TECHBAZAAR_DB_PATH
  ? path.resolve(process.env.TECHBAZAAR_DB_PATH)
  : path.resolve(__dirname, 'techbazaar.db');
const schemaPath = path.resolve(__dirname, 'schema.sql');

export const db = new Database(dbPath);

// Enable WAL mode and foreign key constraints
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);

// Ensure token_version column exists for session invalidation on password change
try {
  const userCols = db.prepare("PRAGMA table_info('users')").all();
  if (!userCols.some(c => c.name === 'token_version')) {
    db.exec('ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0');
  }
} catch {}

// Apply numbered SQL migrations idempotently
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const sqlMigrationPath = path.resolve(__dirname, 'migrations', '002_indexes_and_constraints.sql');
  if (fs.existsSync(sqlMigrationPath)) {
    const applied = db.prepare('SELECT id FROM schema_migrations WHERE id = ?').get('002_indexes_and_constraints');
    if (!applied) {
      db.exec(fs.readFileSync(sqlMigrationPath, 'utf-8'));
      db.prepare('INSERT INTO schema_migrations (id) VALUES (?)').run('002_indexes_and_constraints');
    }
  }
} catch {}

export default db;
