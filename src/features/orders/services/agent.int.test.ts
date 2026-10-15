import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/shared/db/client';
import { messages, orders } from '@/shared/db/schema';
import { adminActor, agentActor } from '@/shared/db/test/actors';
import { makeAgent, makeOrder, truncateAll } from '@/shared/db/test/helpers';
import { assignAgent } from './admin';
import { markDelivered, markPickedUp } from './agent';

beforeEach(truncateAll);

const now = new Date('2026-10-15T13:00:00+05:30');
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);
const load = async (id: string) => (await db.select().from(orders).where(eq(orders.id, id)))[0]!;

describe('agent order services (FR-042, FR-043)', () => {
  it('picks up a Ready order assigned to this agent, telling the customer', async () => {
    const agent = await makeAgent();
    const order = await makeOrder({ status: 'ready', agentId: agent.id, placedAt: minutesAgo(20) });
    expect((await markPickedUp(await agentActor(agent.id), { orderId: order.id }, now)).ok).toBe(true);
    expect((await load(order.id)).status).toBe('picked_up');
    const kinds = (await db.select().from(messages).where(eq(messages.orderId, order.id))).map((m) => m.kind);
    expect(kinds).toContain('order_picked_up');
  });

  it('cannot pick up before Ready, or an order held by someone else', async () => {
    const agent = await makeAgent();
    const preparing = await makeOrder({ status: 'preparing', agentId: agent.id, placedAt: minutesAgo(10) });
    expect(await markPickedUp(await agentActor(agent.id), { orderId: preparing.id }, now)).toMatchObject({ ok: false, error: { code: 'not_ready' } });
    const other = await makeOrder({ status: 'ready', agentId: (await makeAgent()).id, placedAt: minutesAgo(10) });
    expect(await markPickedUp(await agentActor(agent.id), { orderId: other.id }, now)).toMatchObject({ ok: false, error: { code: 'not_found' } });
  });

  it('a cash order needs the cash confirmation and records the grand total; UPI needs none', async () => {
    const agent = await makeAgent();
    const actor = await agentActor(agent.id);
    const cash = await makeOrder({ status: 'picked_up', agentId: agent.id, paymentMethod: 'cod', placedAt: minutesAgo(30) });
    expect(await markDelivered(actor, { orderId: cash.id }, now)).toMatchObject({ ok: false, error: { code: 'cash_not_confirmed' } });
    expect((await markDelivered(actor, { orderId: cash.id, cashCollected: 'true' }, now)).ok).toBe(true);
    expect(await load(cash.id)).toMatchObject({ status: 'delivered', cashCollected: cash.grandTotal, finishedAt: now });
    const upi = await makeOrder({ status: 'picked_up', agentId: agent.id, paymentMethod: 'upi_demo', placedAt: minutesAgo(30) });
    expect((await markDelivered(actor, { orderId: upi.id }, now)).ok).toBe(true);
    expect(await load(upi.id)).toMatchObject({ status: 'delivered', cashCollected: null });
    const kinds = (await db.select().from(messages).where(eq(messages.orderId, upi.id))).map((m) => m.kind);
    expect(kinds).toContain('order_delivered');
  });

  it('an order reassigned away is no longer the agent’s', async () => {
    const first = await makeAgent();
    const order = await makeOrder({ status: 'ready', agentId: first.id, placedAt: minutesAgo(20) });
    await assignAgent(await adminActor(), { orderId: order.id, agentId: (await makeAgent()).id }, now);
    expect(await markPickedUp(await agentActor(first.id), { orderId: order.id }, now)).toMatchObject({ ok: false, error: { code: 'not_found' } });
  });
});
