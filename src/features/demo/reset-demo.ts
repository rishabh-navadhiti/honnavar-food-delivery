import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { dropSchema, migrateDatabase } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { loadCatalogue, type LoadSummary } from './load-catalogue';

/**
 * Restore the known demo state on `databaseUrl` (FR-049): drop everything, run migrations and load
 * the catalogue. Used by `npm run demo:reset`, integration tests and every e2e spec file.
 */
export async function resetDemo(databaseUrl: string): Promise<LoadSummary> {
  await dropSchema(databaseUrl);
  await migrateDatabase(databaseUrl);
  const client = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  try {
    return await loadCatalogue(drizzle(client, { schema }));
  } finally {
    await client.end();
  }
}
