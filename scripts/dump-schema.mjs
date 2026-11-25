import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Database = require(path.join(process.cwd(), 'node_modules/better-sqlite3'));
const dbFile = fs.existsSync(path.join(process.cwd(), 'apps/api/db/techbazaar.db'))
  ? path.join(process.cwd(), 'apps/api/db/techbazaar.db')
  : path.join(process.cwd(), 'server/db/techbazaar.db');

const db = new Database(dbFile, { readonly: true });

const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
const indexes = db.prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();

const schema = {
  tables: tables.map(t => ({
    name: t.name,
    columns: db.prepare(`PRAGMA table_info('${t.name}')`).all().map(c => ({
      name: c.name, type: c.type, notnull: c.notnull, dflt_value: c.dflt_value, pk: c.pk
    }))
  })),
  indexes: indexes.map(i => ({ name: i.name, table: i.tbl_name }))
};

const outIdx = process.argv.indexOf('--out');
const outFile = outIdx !== -1 ? process.argv[outIdx + 1] : null;
const payload = JSON.stringify(schema, null, 2);
if (outFile) {
  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  fs.writeFileSync(path.resolve(outFile), payload);
  console.log(`Dumped ${schema.tables.length} tables & ${schema.indexes.length} indexes to ${outFile}`);
} else {
  console.log(payload);
}
db.close();
