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

// Its own port, so a dev server on :3000 is never reused for e2e runs.
const E2E_PORT = 3100;

export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      testMatch: [/\/us[12356]-.*\.spec\.ts/, /\/ordering-(?!us3-).*\.spec\.ts/],
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
      testMatch: [/\/us4-.*\.spec\.ts/, /ordering-us3-.*\.spec\.ts/],
      use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: 'npm run build && npm run demo:reset && npm run start',
    port: E2E_PORT,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: String(E2E_PORT),
      DEMO_MODE: 'true',
      DEMO_OTP_CODE: process.env.DEMO_OTP_CODE ?? '123456',
      // e2e never calls the public geocoder (research R7).
      GEOCODING_PROVIDER: 'stand-in',
      // Map tiles point at a closed local port, so no e2e run ever loads the public tile server.
      MAP_TILE_URL: 'http://127.0.0.1:9/{z}/{x}/{y}.png',
      // The test runner sets --conditions=react-server; the Next.js server must not inherit it.
      NODE_OPTIONS: '',
    },
  },
});
