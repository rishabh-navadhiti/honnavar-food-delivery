import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { agents } from '@/shared/db/schema';

export async function getAgentProfile(agentId: string) {
  const [row] = await db.select().from(agents).where(eq(agents.id, agentId));
  return row ?? null;
}

export async function listAgents() {
  return db.select().from(agents).orderBy(asc(agents.name));
}
