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

describe('reorder (FR-052, optional)', () => {
  async function delivered() {
    const { makeKitchenWithMenu } = await import('@/shared/db/test/helpers');
    const { orderItems } = await import('@/shared/db/schema');
    const menu = await makeKitchenWithMenu();
    const order = await makeOrder({ kitchenId: menu.kitchen.id, status: 'delivered', placedAt: minutesAgo(60) });
    await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
    await db.insert(orderItems).values([
      { orderId: order.id, position: 0, dishId: menu.dishes[0].id, nameEn: 'Neer dose', nameKn: 'ನೀರ್ ದೋಸೆ', isVeg: true, priceRupees: 50, quantity: 2, lineTotal: 100 },
      { orderId: order.id, position: 1, dishId: menu.dishes[1].id, nameEn: 'Fish thali', nameKn: 'ಮೀನು ಊಟ', isVeg: false, priceRupees: 180, quantity: 1, lineTotal: 180 },
    ]);
    return { order, menu };
  }

  it('fills the cart with the order’s dishes that are still available, and names the ones left out', async () => {
    const { reorder } = await import('./customer');
    const { dishes } = await import('@/shared/db/schema');
    const { order, menu } = await delivered();
    await db.update(dishes).set({ available: false }).where(eq(dishes.id, menu.dishes[1].id));
    const result = await reorder(await customerActor(order.customerId), { orderId: order.id }, null);
    expect(result).toEqual({
      ok: true,
      data: {
        cart: { v: 1, kitchenId: menu.kitchen.id, lines: [{ dishId: menu.dishes[0].id, qty: 2 }] },
        leftOut: [{ en: 'Fish thali', kn: 'ಮೀನು ಊಟ' }],
      },
    });
  });

  it('asks before replacing another kitchen’s cart, and refuses another customer’s order', async () => {
    const { reorder } = await import('./customer');
    const { order, menu } = await delivered();
    const otherCart = { v: 1 as const, kitchenId: crypto.randomUUID(), lines: [{ dishId: crypto.randomUUID(), qty: 1 }] };
    const customer = await customerActor(order.customerId);
    expect(await reorder(customer, { orderId: order.id }, otherCart)).toMatchObject({ ok: false, error: { code: 'other_kitchen' } });
    expect(await reorder(customer, { orderId: order.id, replace: 'true' }, otherCart)).toMatchObject({ ok: true, data: { cart: { kitchenId: menu.kitchen.id } } });
    expect(await reorder(await customerActor(), { orderId: order.id }, null)).toMatchObject({ ok: false, error: { code: 'not_found' } });
  });

  it('lists past orders after ongoing ones', async () => {
    const { listCustomerOrders } = await import('../queries');
    const customer = await customerActor();
    const past = await makeOrder({ customerId: customer.customerId, status: 'delivered', placedAt: minutesAgo(10) });
    const ongoing = await makeOrder({ customerId: customer.customerId, status: 'preparing', placedAt: minutesAgo(60) });
    expect((await listCustomerOrders(customer.customerId, now)).map((o) => o.id)).toEqual([ongoing.id, past.id]);
  });
});
