/**
 * End-to-end tests.
 *
 * WARNING: `npm run test:e2e` RESETS the database named by DATABASE_URL (the web server runs
 * `npm run demo:reset`, and every spec file resets again in `beforeAll`). Point DATABASE_URL at a
 * disposable database.
 */
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { defineConfig, devices } from '@playwright/test';

if (existsSync('.env.local')) loadEnvFile('.env.local');

export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      testMatch: /us[12356]-.*\.spec\.ts/,
      use: {
        ...devices['Pixel 5'],
        browserName: 'chromium',
        viewport: { width: 360, height: 780 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'desktop',
      testMatch: /us4-.*\.spec\.ts/,
      use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: 'npm run build && npm run demo:reset && npm run start',
    port: 3000,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DEMO_MODE: 'true',
      DEMO_OTP_CODE: process.env.DEMO_OTP_CODE ?? '123456',
      // The test runner sets --conditions=react-server; the Next.js server must not inherit it.
      NODE_OPTIONS: '',
    },
  },
});
