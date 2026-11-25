import fs from 'node:fs';
import path from 'node:path';
import db from '../server/db/index.js';

const backupsDir = path.resolve(process.cwd(), 'server', 'db', 'backups');
fs.mkdirSync(backupsDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outPath = path.join(backupsDir, `techbazaar-${stamp}.db`);

await db.backup(outPath);
const stat = fs.statSync(outPath);
console.log(`✅ SQLite backup created: ${outPath} (${(stat.size / 1024).toFixed(1)} KB)`);
process.exit(0);
