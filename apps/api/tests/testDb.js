import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function setupTempDb(prefix = 'tb-test-') {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const srcBase = path.resolve(__dirname, '../db/techbazaar.db');
  const destBase = path.join(tempDir, 'test.db');

  fs.copyFileSync(srcBase, destBase);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(srcBase + suffix)) {
      fs.copyFileSync(srcBase + suffix, destBase + suffix);
    }
  }

  process.env.TECHBAZAAR_DB_PATH = destBase;
  process.env.NODE_ENV = 'test';

  return {
    tempDir,
    tempDbPath: destBase,
    cleanup: () => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    }
  };
}
