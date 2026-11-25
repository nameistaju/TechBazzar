import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const API_ROOT = path.resolve(__dirname, '..');
export const REPO_ROOT = path.resolve(API_ROOT, '../..');

export const ENV_PATHS = [
  path.join(API_ROOT, '.env'),
  path.join(REPO_ROOT, '.env')
];

export const DB_PATH = process.env.TECHBAZAAR_DB_PATH
  ? path.resolve(process.env.TECHBAZAAR_DB_PATH)
  : path.join(API_ROOT, 'db', 'techbazaar.db');

export const DB_DIR = path.join(API_ROOT, 'db');
export const DB_BACKUPS_DIR = path.join(DB_DIR, 'backups');

export const WEB_PUBLIC_DIR = path.join(REPO_ROOT, 'apps', 'web', 'public');
export const UPLOADS_DIR = path.join(WEB_PUBLIC_DIR, 'uploads');

export function resolveDistDir() {
  const webDist = path.join(REPO_ROOT, 'apps', 'web', 'dist');
  if (fs.existsSync(path.join(webDist, 'index.html'))) {
    return webDist;
  }
  return path.join(REPO_ROOT, 'dist');
}
