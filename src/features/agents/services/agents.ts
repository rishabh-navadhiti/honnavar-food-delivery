import 'server-only';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { agents } from '@/shared/db/schema';
import { err, ok, type Result } from '@/shared/result';
import { fields, parseInput } from '@/shared/validation';
import { z } from 'zod';
import type { Actor } from '../../auth/actor-scope';
import { deleteSessionsForSubject } from '../../auth/session-store';
import { requireAdmin } from '../../kitchens/services/admin';
import { agentSchema, type AgentInput } from '../schemas';

/** Register or edit a delivery agent (FR-026); one agent per number (FR-027). */
export async function saveAgent(actor: Actor, input: AgentInput): Promise<Result<{ id: string }>> {
  const admin = requireAdmin(actor);
  if (!admin.ok) return admin;
  const parsed = parseInput(agentSchema, input);
  if (!parsed.ok) return parsed;
  const { id, ...values } = parsed.data;
  const [clash] = await db
    .select({ name: agents.name })
    .from(agents)
    .where(id ? and(eq(agents.phone, values.phone), ne(agents.id, id)) : eq(agents.phone, values.phone));
  if (clash) return err('agent_phone_taken', undefined, { agentName: clash.name });
  if (id) {
    const updated = await db.update(agents).set({ ...values, updatedAt: new Date() }).where(eq(agents.id, id)).returning({ id: agents.id });
    return updated.length > 0 ? ok({ id }) : err('not_found');
  }
  const [row] = await db.insert(agents).values(values).returning({ id: agents.id });
  return ok({ id: row!.id });
}

/** Deactivating an agent ends their sessions (FR-007). */
const activeSchema = z.object({ id: fields.id(), active: z.boolean({ error: 'invalid' }) });

export async function setAgentActive(actor: Actor, raw: { id: string; active: boolean }): Promise<Result<object>> {
  const admin = requireAdmin(actor);
  if (!admin.ok) return admin;
  const parsed = parseInput(activeSchema, raw);
  if (!parsed.ok) return parsed;
  const input = parsed.data;
  const updated = await db
    .update(agents)
    .set({ active: input.active, updatedAt: new Date() })
    .where(eq(agents.id, input.id))
    .returning({ id: agents.id });
  if (updated.length === 0) return err('not_found');
  if (!input.active) await deleteSessionsForSubject('agent', input.id);
  return ok({});
}
