import dotenv from 'dotenv';
import fs from 'node:fs';
import { ENV_PATHS } from './paths.js';

for (const envFile of ENV_PATHS) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
  }
}
