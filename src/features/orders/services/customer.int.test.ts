import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/shared/db/client';
import { messages, orderEvents, orders } from '@/shared/db/schema';
import { customerActor } from '@/shared/db/test/actors';
import { makeOrder, truncateAll } from '@/shared/db/test/helpers';
import { cancelOrderByCustomer } from './customer';

beforeEach(truncateAll);

const now = new Date('2026-10-15T13:00:00+05:30');
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

describe('cancelOrderByCustomer (FR-027)', () => {
  it('cancels the customer’s own Placed order, with no reason, telling the kitchen', async () => {
    const order = await makeOrder({ placedAt: minutesAgo(1) });
    const customer = await customerActor(order.customerId);
    expect((await cancelOrderByCustomer(customer, { orderId: order.id }, now)).ok).toBe(true);
    const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(row).toMatchObject({ status: 'cancelled', reason: null, finishedAt: now });
    const events = await db.select().from(orderEvents).where(eq(orderEvents.orderId, order.id));
    expect(events.find((e) => e.kind === 'cancelled')).toMatchObject({ actor: 'customer', actorPhone: customer.phone });
    const sent = (await db.select().from(messages).where(eq(messages.orderId, order.id))).map((m) => [m.recipient, m.kind]).sort();
    expect(sent).toEqual([
      ['customer', 'order_cancelled'],
      ['kitchen', 'kitchen_order_cancelled'],
    ]);
  });

  it('is refused once the kitchen has accepted, and for another customer’s order', async () => {
    const accepted = await makeOrder({ status: 'accepted', placedAt: minutesAgo(3) });
    expect(await cancelOrderByCustomer(await customerActor(accepted.customerId), { orderId: accepted.id }, now)).toMatchObject({
      ok: false,
      error: { code: 'order_moved_on', details: { status: 'accepted' } },
    });
    const placed = await makeOrder({ placedAt: minutesAgo(1) });
    expect(await cancelOrderByCustomer(await customerActor(), { orderId: placed.id }, now)).toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });
  });
});
