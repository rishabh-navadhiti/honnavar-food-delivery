import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { customerAddresses } from '@/shared/db/schema';

export async function listAddresses(customerId: string) {
  return db.select().from(customerAddresses).where(eq(customerAddresses.customerId, customerId)).orderBy(asc(customerAddresses.createdAt));
}

/** The customer's own address, or null (another customer's id is not found). */
export async function getAddress(customerId: string, id: string) {
  const [row] = await db
    .select()
    .from(customerAddresses)
    .where(and(eq(customerAddresses.id, id), eq(customerAddresses.customerId, customerId)));
  return row ?? null;
}
