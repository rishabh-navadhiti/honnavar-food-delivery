import { fileURLToPath } from 'node:url';
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

if (existsSync('.env.local')) loadEnvFile('.env.local');

const alias = { '@': fileURLToPath(new URL('./src', import.meta.url)) };

export default defineConfig({
  test: {
    projects: [
      {
        // `server-only` resolves to a no-op only under the react-server condition.
        resolve: { alias, conditions: ['react-server'] },
        ssr: { resolve: { conditions: ['react-server'] } },
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.int.test.ts', 'node_modules/**'],
          environment: 'node',
        },
      },
      {
        resolve: { alias, conditions: ['react-server'] },
        ssr: { resolve: { conditions: ['react-server'] } },
        test: {
          name: 'integration',
          include: ['src/**/*.int.test.ts'],
          environment: 'node',
          globalSetup: ['src/shared/db/test/global-setup.ts'],
          fileParallelism: false,
          // Integration tests run against TEST_DATABASE_URL, never the app database.
          env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? '' },
        },
      },
    ],
  },
});
