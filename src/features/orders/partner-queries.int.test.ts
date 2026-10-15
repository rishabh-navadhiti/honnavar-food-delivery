import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/shared/db/client';
import { customers } from '@/shared/db/schema';
import { partnerActor } from '@/shared/db/test/actors';
import { makeCustomer, makeKitchenWithMenu, makeOrder, truncateAll } from '@/shared/db/test/helpers';
import { env } from '@/shared/env';
import { handleNewOrderFeed } from './handlers';
import { getNewOrderFeed, getPartnerDay, getPartnerOrder, listPartnerOrders } from './partner-queries';

beforeEach(truncateAll);

const now = new Date('2026-10-15T13:00:00+05:30');
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

describe('partner read models (FR-028, FR-031, FR-032)', () => {
  it('lists the kitchen’s open orders newest first, with time left for Placed ones', async () => {
    const { kitchen } = await makeKitchenWithMenu();
    const placed = await makeOrder({ kitchenId: kitchen.id, placedAt: minutesAgo(3) });
    const accepted = await makeOrder({ kitchenId: kitchen.id, status: 'accepted', placedAt: minutesAgo(5) });
    await makeOrder({ kitchenId: kitchen.id, status: 'delivered', placedAt: minutesAgo(50) });
    await makeOrder({ placedAt: minutesAgo(1) }); // another kitchen
    const list = await listPartnerOrders(kitchen.id, now);
    expect(list.map((o) => o.id)).toEqual([placed.id, accepted.id]);
    expect(list[0]!.timeLeftMs).toBe((env.ACCEPT_WINDOW_MINUTES - 3) * 60_000);
    expect(list[1]!.timeLeftMs).toBeNull();
  });

  it('shows the customer’s display name, landmark and rider note, but never their phone or full address', async () => {
    const customer = await makeCustomer({ displayName: 'Asha' });
    const order = await makeOrder({ customerId: customer.id, placedAt: minutesAgo(1) });
    const view = await getPartnerOrder(order.kitchenId, order.id, now);
    expect(view).toMatchObject({ customerName: 'Asha', landmark: 'Behind the temple', riderNote: 'Ring twice' });
    const text = JSON.stringify(view);
    expect(text).not.toContain(customer.phone);
    expect(text).not.toContain('Door 1-23');
    await db.update(customers).set({ displayName: null }).where(eq(customers.id, customer.id));
    expect((await getPartnerOrder(order.kitchenId, order.id, now))!.customerName).toBeNull();
    expect(await getPartnerOrder(crypto.randomUUID(), order.id, now)).toBeNull();
  });

  it('says who cancelled an order', async () => {
    const order = await makeOrder({ status: 'cancelled', placedAt: minutesAgo(10) });
    const view = await getPartnerOrder(order.kitchenId, order.id, now);
    expect(view).toMatchObject({ status: 'cancelled', cancelledBy: 'admin' });
  });

  it('totals today in IST: received, accepted, rejected or cancelled, delivered, and delivered food value', async () => {
    const { kitchen } = await makeKitchenWithMenu();
    await makeOrder({ kitchenId: kitchen.id, status: 'delivered', placedAt: minutesAgo(60) });
    await makeOrder({ kitchenId: kitchen.id, status: 'delivered', placedAt: minutesAgo(30) });
    await makeOrder({ kitchenId: kitchen.id, status: 'rejected', placedAt: minutesAgo(20) });
    await makeOrder({ kitchenId: kitchen.id, status: 'cancelled', placedAt: minutesAgo(15) });
    await makeOrder({ kitchenId: kitchen.id, status: 'preparing', placedAt: minutesAgo(5) });
    await makeOrder({ kitchenId: kitchen.id, status: 'delivered', placedAt: new Date('2026-10-14T20:00:00+05:30') }); // yesterday
    const day = await getPartnerDay(kitchen.id, now);
    expect(day.orders).toHaveLength(5);
    expect(day.totals).toEqual({ received: 5, accepted: 3, rejectedOrCancelled: 2, delivered: 2, deliveredValue: 240 });
  });

  it('feeds only Placed orders to the new-order alert, after expiry', async () => {
    const { kitchen } = await makeKitchenWithMenu();
    const fresh = await makeOrder({ kitchenId: kitchen.id, placedAt: minutesAgo(1) });
    await makeOrder({ kitchenId: kitchen.id, placedAt: minutesAgo(env.ACCEPT_WINDOW_MINUTES + 1) });
    await makeOrder({ kitchenId: kitchen.id, status: 'accepted', placedAt: minutesAgo(2) });
    expect((await getNewOrderFeed(kitchen.id, now)).map((o) => o.id)).toEqual([fresh.id]);
  });
});

describe('GET /partner/orders/new', () => {
  it('needs a partner session and answers for that kitchen only, uncached', async () => {
    expect((await handleNewOrderFeed(null, now)).status).toBe(401);
    const { kitchen } = await makeKitchenWithMenu();
    const order = await makeOrder({ kitchenId: kitchen.id, placedAt: minutesAgo(1) });
    await makeOrder({ placedAt: minutesAgo(1) });
    const response = await handleNewOrderFeed(await partnerActor(kitchen.id), now);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const body = (await response.json()) as { orders: { id: string; orderNo: number }[] };
    expect(body.orders.map((o) => o.id)).toEqual([order.id]);
  });
});
