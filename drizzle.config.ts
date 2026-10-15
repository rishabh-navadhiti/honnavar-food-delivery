import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { defineConfig } from 'drizzle-kit';

if (existsSync('.env.local')) loadEnvFile('.env.local');

export default defineConfig({
  schema: './src/shared/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
