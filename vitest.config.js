import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    include: ['tests/backend/**/*.test.js', 'tests/frontend/**/*.test.{js,jsx}'],
    environment: 'node',
    environmentMatchGlobs: [
      ['tests/frontend/**', 'jsdom'],
      ['tests/backend/**', 'node']
    ]
  }
});
