import { asc, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/shared/db/client';
import { messages, orderEvents, orders } from '@/shared/db/schema';
import { adminActor, agentActor, customerActor, partnerActor } from '@/shared/db/test/actors';
import { makeAgent, makeOrder, truncateAll } from '@/shared/db/test/helpers';
import { env } from '@/shared/env';
import { expireOverdueOrders } from './expire';
import { applyTransition } from './transition';

beforeEach(truncateAll);

const MIN = 60_000;
const now = new Date('2026-10-15T13:00:00+05:30');
const minutesAgo = (m: number) => new Date(now.getTime() - m * MIN);

async function reload(id: string) {
  const [row] = await db.select().from(orders).where(eq(orders.id, id));
  return row!;
}
const eventsOf = (id: string) => db.select().from(orderEvents).where(eq(orderEvents.orderId, id)).orderBy(asc(orderEvents.at));
const messagesOf = (id: string) => db.select().from(messages).where(eq(messages.orderId, id));

describe('applyTransition (research R4)', () => {
  it('changes the status, stamps times, records the event and writes the messages in one go', async () => {
    const order = await makeOrder({ placedAt: minutesAgo(1) });
    const partner = await partnerActor(order.kitchenId);
    const result = await applyTransition({ orderId: order.id, action: { type: 'accept' }, actor: partner, now });
    expect(result.ok).toBe(true);

    const row = await reload(order.id);
    expect(row.status).toBe('accepted');
    expect(row.statusChangedAt).toEqual(now);
    expect(row.finishedAt).toBeNull();

    const events = await eventsOf(order.id);
    expect(events.at(-1)).toMatchObject({ kind: 'accepted', actor: 'partner', actorPhone: partner.phone, at: now });
    const msgs = await messagesOf(order.id);
    expect(msgs.map((m) => [m.recipient, m.kind])).toEqual([['customer', 'order_accepted']]);
  });

  it('records the reason and note on rejection and finishes the order', async () => {
    const order = await makeOrder({ placedAt: minutesAgo(1) });
    const partner = await partnerActor(order.kitchenId);
    await applyTransition({ orderId: order.id, action: { type: 'reject' }, actor: partner, now, reason: 'other', note: 'Gas ran out' });
    const row = await reload(order.id);
    expect(row).toMatchObject({ status: 'rejected', reason: 'other', reasonNote: 'Gas ran out', finishedAt: now });
    expect((await eventsOf(order.id)).at(-1)).toMatchObject({ kind: 'rejected', reason: 'other', reasonNote: 'Gas ran out' });
  });

  it('assignment and reassignment set the agent, record the previous one and tell both agents', async () => {
    const order = await makeOrder({ status: 'accepted', placedAt: minutesAgo(5) });
    const admin = await adminActor();
    const first = await makeAgent();
    const second = await makeAgent();
    await applyTransition({ orderId: order.id, action: { type: 'assign', agentId: first.id }, actor: admin, now });
    expect(await reload(order.id)).toMatchObject({ status: 'accepted', agentId: first.id, assignedAt: now });
    await applyTransition({ orderId: order.id, action: { type: 'assign', agentId: second.id }, actor: admin, now });
    expect((await reload(order.id)).agentId).toBe(second.id);
    expect((await eventsOf(order.id)).at(-1)).toMatchObject({ kind: 'reassigned', agentId: second.id, previousAgentId: first.id });
    const kinds = (await messagesOf(order.id)).map((m) => [m.kind, m.agentId]);
    expect(kinds).toContainEqual(['agent_unassigned', first.id]);
    expect(kinds).toContainEqual(['agent_assigned', second.id]);
  });

  it('records cash collected when a cash order is delivered', async () => {
    const agent = await makeAgent();
    const order = await makeOrder({ status: 'picked_up', agentId: agent.id, placedAt: minutesAgo(30) });
    const result = await applyTransition({
      orderId: order.id,
      action: { type: 'deliver', cashConfirmed: true },
      actor: await agentActor(agent.id),
      now,
    });
    expect(result.ok).toBe(true);
    expect(await reload(order.id)).toMatchObject({ status: 'delivered', cashCollected: order.grandTotal, finishedAt: now });
  });

  it('refuses with the lifecycle code and changes nothing', async () => {
    const order = await makeOrder({ status: 'accepted', placedAt: minutesAgo(5) });
    const customer = await customerActor(order.customerId);
    const result = await applyTransition({ orderId: order.id, action: { type: 'cancel' }, actor: customer, now });
    expect(result).toEqual({ ok: false, error: { code: 'order_moved_on', details: { status: 'accepted' } } });
    expect((await reload(order.id)).status).toBe('accepted');
  });

  it('keeps people to their own orders: another kitchen or customer gets not_found', async () => {
    const order = await makeOrder({ placedAt: minutesAgo(1) });
    const other = await makeOrder({ placedAt: minutesAgo(1) });
    const otherPartner = await partnerActor(other.kitchenId);
    expect(await applyTransition({ orderId: order.id, action: { type: 'accept' }, actor: otherPartner, now })).toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });
    const otherCustomer = await customerActor(other.customerId);
    expect(await applyTransition({ orderId: order.id, action: { type: 'cancel' }, actor: otherCustomer, now })).toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });
  });

  it('two concurrent changes: exactly one wins, the other sees the order has moved on', async () => {
    const order = await makeOrder({ placedAt: minutesAgo(1) });
    const partner = await partnerActor(order.kitchenId);
    const customer = await customerActor(order.customerId);
    const results = await Promise.all([
      applyTransition({ orderId: order.id, action: { type: 'accept' }, actor: partner, now }),
      applyTransition({ orderId: order.id, action: { type: 'cancel' }, actor: customer, now }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const loser = results.find((r) => !r.ok)!;
    expect(loser).toMatchObject({ ok: false, error: { code: 'order_moved_on' } });
    const final = await reload(order.id);
    expect(['accepted', 'cancelled']).toContain(final.status);
    expect((await eventsOf(order.id)).filter((e) => e.kind !== 'placed')).toHaveLength(1);
  });
});

describe('expireOverdueOrders (research R5, FR-020)', () => {
  const window = env.ACCEPT_WINDOW_MINUTES;

  it('rejects overdue Placed orders as the system, with an event and a customer message', async () => {
    const overdue = await makeOrder({ placedAt: minutesAgo(window + 1) });
    const fresh = await makeOrder({ placedAt: minutesAgo(window - 1) });
    const accepted = await makeOrder({ status: 'accepted', placedAt: minutesAgo(window + 5) });

    expect(await expireOverdueOrders(db, now, { all: true })).toBe(1);

    expect(await reload(overdue.id)).toMatchObject({
      status: 'rejected',
      reason: 'kitchen_no_response',
      statusChangedAt: now,
      finishedAt: now,
    });
    expect((await eventsOf(overdue.id)).at(-1)).toMatchObject({ kind: 'rejected', actor: 'system', actorPhone: null, at: now });
    expect((await messagesOf(overdue.id)).map((m) => [m.recipient, m.kind, m.params.reason])).toEqual([
      ['customer', 'order_rejected', 'kitchen_no_response'],
    ]);
    expect((await reload(fresh.id)).status).toBe('placed');
    expect((await reload(accepted.id)).status).toBe('accepted');
  });

  it('is not overdue at exactly the deadline', async () => {
    const order = await makeOrder({ placedAt: minutesAgo(window) });
    expect(await expireOverdueOrders(db, now, { orderId: order.id })).toBe(0);
  });

  it('only touches the given scope', async () => {
    const a = await makeOrder({ placedAt: minutesAgo(window + 1) });
    const b = await makeOrder({ placedAt: minutesAgo(window + 1) });
    expect(await expireOverdueOrders(db, now, { kitchenId: a.kitchenId })).toBe(1);
    expect((await reload(b.id)).status).toBe('placed');
    expect(await expireOverdueOrders(db, now, { customerId: b.customerId })).toBe(1);
    expect((await reload(b.id)).status).toBe('rejected');
  });

  it('running it again changes nothing more', async () => {
    const order = await makeOrder({ placedAt: minutesAgo(window + 1) });
    await expireOverdueOrders(db, now, { all: true });
    expect(await expireOverdueOrders(db, now, { all: true })).toBe(0);
    expect(await messagesOf(order.id)).toHaveLength(1);
  });

  it('a late accept is refused once the window has passed, and the system rejection is recorded', async () => {
    const order = await makeOrder({ placedAt: minutesAgo(window + 1) });
    const partner = await partnerActor(order.kitchenId);
    const result = await applyTransition({ orderId: order.id, action: { type: 'accept' }, actor: partner, now });
    expect(result).toEqual({ ok: false, error: { code: 'order_moved_on', details: { status: 'rejected' } } });
    expect((await eventsOf(order.id)).at(-1)).toMatchObject({ kind: 'rejected', actor: 'system' });
  });

  it('expiry racing an accept leaves exactly one outcome', async () => {
    const order = await makeOrder({ placedAt: minutesAgo(window + 1) });
    const partner = await partnerActor(order.kitchenId);
    // The accept runs with a clock just inside the window, the expiry with one just outside.
    const insideWindow = minutesAgo(1);
    await Promise.all([
      expireOverdueOrders(db, now, { orderId: order.id }),
      applyTransition({ orderId: order.id, action: { type: 'accept' }, actor: partner, now: insideWindow }),
    ]);
    const final = await reload(order.id);
    expect(['accepted', 'rejected']).toContain(final.status);
    expect((await eventsOf(order.id)).filter((e) => e.kind !== 'placed')).toHaveLength(1);
  });
});
