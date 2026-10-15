import { eq } from 'drizzle-orm';
import type { Actor, AgentActor, CustomerActor } from '@/features/auth/actor-scope';
import { db } from '../client';
import { agents, customers } from '../schema';
import { makeAdmin, makeAgent, makeCustomer, makeSignin } from './helpers';

export async function partnerActor(kitchenId: string): Promise<Actor> {
  const signin = await makeSignin(kitchenId);
  return { role: 'partner', phone: signin.phone, signinId: signin.id, kitchenId };
}

export async function adminActor(): Promise<Actor> {
  const admin = await makeAdmin();
  return { role: 'admin', phone: admin.phone, adminId: admin.id };
}

/** The given customer as an actor, or a new one. */
export async function customerActor(customerId?: string): Promise<CustomerActor> {
  const [row] = customerId ? await db.select().from(customers).where(eq(customers.id, customerId)) : [await makeCustomer()];
  return { role: 'customer', customerId: row!.id, phone: row!.phone };
}

/** The given agent as an actor, or a new one. */
export async function agentActor(agentId?: string): Promise<AgentActor> {
  const [row] = agentId ? await db.select().from(agents).where(eq(agents.id, agentId)) : [await makeAgent()];
  return { role: 'agent', agentId: row!.id, phone: row!.phone };
}
