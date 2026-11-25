import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5000',
    channel: 'chrome',
    headless: true,
    screenshot: 'only-on-failure'
  }
});
