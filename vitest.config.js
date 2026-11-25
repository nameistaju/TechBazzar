import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
