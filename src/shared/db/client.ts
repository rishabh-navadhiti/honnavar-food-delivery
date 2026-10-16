import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env } from '../env';
import * as schema from './schema';

const globalForDb = globalThis as unknown as { hfdSql?: postgres.Sql };

/** Neon's pooled endpoints (host contains "-pooler") run PgBouncer in transaction mode, which cannot
 * hold named prepared statements across requests; postgres.js must not prepare there. */
const pooled = /-pooler\./.test(env.DATABASE_URL);
const sqlClient =
  globalForDb.hfdSql ?? postgres(env.DATABASE_URL, { max: 10, prepare: !pooled, onnotice: () => {} });
if (process.env.NODE_ENV !== 'production') globalForDb.hfdSql = sqlClient;

export const db = drizzle(sqlClient, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
/** Either the shared client or an open transaction. */
export type Executor = Db | Tx;

export const MIGRATIONS_FOLDER = 'drizzle';

/** Drop every table (public schema and Drizzle's bookkeeping) on the given database. */
export async function dropSchema(url: string): Promise<void> {
  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await client.unsafe(
      'drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;',
    );
  } finally {
    await client.end();
  }
}

export async function migrateDatabase(url: string): Promise<void> {
  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await client.end();
  }
}
