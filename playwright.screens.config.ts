/**
 * Screenshot capture for reviews (003, FR-028, research R14): `npm run screens`.
 *
 * Not part of `npm run test:e2e`. It uses the same web server as the e2e config, so it also RESETS
 * the DATABASE_URL database. Images go to `screens/` (git-ignored) with an `index.html` contact sheet.
 */
import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testDir: 'e2e/screens',
  reporter: [['list']],
  workers: 1,
  retries: 0,
  timeout: 600_000,
  projects: [{ name: 'screens', use: { browserName: 'chromium' } }],
});
