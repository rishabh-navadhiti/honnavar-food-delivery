import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { customers } from '@/shared/db/schema';

export async function getCustomer(customerId: string) {
  const [row] = await db.select().from(customers).where(eq(customers.id, customerId));
  return row ?? null;
}
