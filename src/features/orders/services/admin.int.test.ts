import { asc, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/shared/db/client';
import { agents, messages, orderEvents, orders } from '@/shared/db/schema';
import { adminActor, agentActor, partnerActor } from '@/shared/db/test/actors';
import { makeAgent, makeOrder, truncateAll } from '@/shared/db/test/helpers';
import { assignAgent, cancelOrderByAdmin } from './admin';
import { markPickedUp } from './agent';

beforeEach(truncateAll);

const now = new Date('2026-10-15T13:00:00+05:30');
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);
const load = async (id: string) => (await db.select().from(orders).where(eq(orders.id, id)))[0]!;

describe('assignAgent (FR-016, FR-034)', () => {
  it('assigns an active agent, telling the kitchen and the agent', async () => {
    const order = await makeOrder({ status: 'accepted', placedAt: minutesAgo(5) });
    const agent = await makeAgent();
    const result = await assignAgent(await adminActor(), { orderId: order.id, agentId: agent.id }, now);
    expect(result.ok).toBe(true);
    expect(await load(order.id)).toMatchObject({ status: 'accepted', agentId: agent.id });
    const sent = (await db.select().from(messages).where(eq(messages.orderId, order.id))).map((m) => [m.recipient, m.kind]);
    expect(sent).toEqual(expect.arrayContaining([['kitchen', 'kitchen_agent_assigned'], ['agent', 'agent_assigned']]));
  });

  it('reassigns, recording the previous agent and telling both agents', async () => {
    const order = await makeOrder({ status: 'preparing', placedAt: minutesAgo(5) });
    const admin = await adminActor();
    const first = await makeAgent();
    const second = await makeAgent();
    await assignAgent(admin, { orderId: order.id, agentId: first.id }, now);
    await assignAgent(admin, { orderId: order.id, agentId: second.id }, now);
    const last = (await db.select().from(orderEvents).where(eq(orderEvents.orderId, order.id)).orderBy(asc(orderEvents.at))).at(-1)!;
    expect(last).toMatchObject({ kind: 'reassigned', agentId: second.id, previousAgentId: first.id });
    const toAgents = (await db.select().from(messages).where(eq(messages.orderId, order.id)))
      .filter((m) => m.recipient === 'agent')
      .map((m) => [m.agentId, m.kind]);
    expect(toAgents).toEqual(expect.arrayContaining([[first.id, 'agent_unassigned'], [second.id, 'agent_assigned']]));
  });

  it('refuses inactive agents, the same agent, and orders that are Placed, picked up or finished', async () => {
    const admin = await adminActor();
    const inactive = await makeAgent({ active: false });
    const accepted = await makeOrder({ status: 'accepted', placedAt: minutesAgo(5) });
    expect(await assignAgent(admin, { orderId: accepted.id, agentId: inactive.id }, now)).toMatchObject({ ok: false, error: { code: 'agent_inactive' } });
    const agent = await makeAgent();
    await assignAgent(admin, { orderId: accepted.id, agentId: agent.id }, now);
    expect(await assignAgent(admin, { orderId: accepted.id, agentId: agent.id }, now)).toMatchObject({ ok: false, error: { code: 'same_agent' } });
    for (const status of ['placed', 'picked_up', 'delivered', 'cancelled'] as const) {
      const order = await makeOrder({ status, placedAt: minutesAgo(5) });
      expect(await assignAgent(admin, { orderId: order.id, agentId: agent.id }, now), status).toMatchObject({
        ok: false,
        error: { code: 'not_assignable', details: { status } },
      });
    }
  });

  it('only admins assign', async () => {
    const order = await makeOrder({ status: 'accepted', placedAt: minutesAgo(5) });
    const agent = await makeAgent();
    expect(await assignAgent(await partnerActor(order.kitchenId), { orderId: order.id, agentId: agent.id }, now)).toMatchObject({
      ok: false,
      error: { code: 'unauthorised' },
    });
  });

  it('a reassignment racing the agent’s pickup: exactly one wins', async () => {
    const holder = await makeAgent();
    const order = await makeOrder({ status: 'ready', agentId: holder.id, placedAt: minutesAgo(20) });
    const other = await makeAgent();
    const results = await Promise.all([
      assignAgent(await adminActor(), { orderId: order.id, agentId: other.id }, now),
      markPickedUp(await agentActor(holder.id), { orderId: order.id }, now),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const final = await load(order.id);
    expect(final.status === 'picked_up' ? final.agentId === holder.id : final.agentId === other.id).toBe(true);
  });
});

describe('cancelOrderByAdmin (FR-035)', () => {
  it('cancels from any unfinished status with a reason; "other" needs a note', async () => {
    const admin = await adminActor();
    const agent = await makeAgent();
    const order = await makeOrder({ status: 'picked_up', agentId: agent.id, placedAt: minutesAgo(30) });
    expect(await cancelOrderByAdmin(admin, { orderId: order.id, reason: 'other' }, now)).toMatchObject({
      ok: false,
      error: { fieldErrors: { note: 'noteRequired' } },
    });
    expect(await cancelOrderByAdmin(admin, { orderId: order.id, reason: 'kitchen_busy' }, now)).toMatchObject({ ok: false, error: { code: 'invalid' } });
    expect((await cancelOrderByAdmin(admin, { orderId: order.id, reason: 'other', note: 'Customer not reachable' }, now)).ok).toBe(true);
    expect(await load(order.id)).toMatchObject({ status: 'cancelled', reason: 'other', reasonNote: 'Customer not reachable' });
    const recipients = (await db.select().from(messages).where(eq(messages.orderId, order.id))).map((m) => [m.recipient, m.kind]);
    expect(recipients).toEqual(
      expect.arrayContaining([['customer', 'order_cancelled'], ['kitchen', 'kitchen_order_cancelled'], ['agent', 'agent_order_cancelled']]),
    );
  });

  it('refuses a finished order as moved on', async () => {
    const order = await makeOrder({ status: 'delivered', placedAt: minutesAgo(60) });
    expect(await cancelOrderByAdmin(await adminActor(), { orderId: order.id, reason: 'customer_request' }, now)).toMatchObject({
      ok: false,
      error: { code: 'order_moved_on' },
    });
    expect(await db.$count(agents)).toBeGreaterThan(0);
  });
});
