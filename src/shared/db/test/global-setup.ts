/**
 * Vitest global setup for the integration project: rebuild the test database from migrations.
 * Self-contained on purpose (no app modules), because global setup runs outside the test workers.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

export default async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('TEST_DATABASE_URL is required for integration tests. See .env.example.');
  }
  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await client.unsafe(
      'drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;',
    );
    await migrate(drizzle(client), { migrationsFolder: 'drizzle' });
  } finally {
    await client.end();
  }
}
