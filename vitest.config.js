import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, 'apps/web/src/app'),
      '@features': path.resolve(__dirname, 'apps/web/src/features'),
      '@shared': path.resolve(__dirname, 'apps/web/src/shared')
    }
  },
  test: {
    globals: true,
    include: ['apps/api/tests/**/*.test.js', 'apps/web/tests/**/*.test.{js,jsx}'],
    environment: 'node',
    environmentMatchGlobs: [
      ['apps/web/tests/**', 'jsdom'],
      ['apps/api/tests/**', 'node']
    ]
  }
});
