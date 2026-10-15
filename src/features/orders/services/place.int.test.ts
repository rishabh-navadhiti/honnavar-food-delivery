import { asc, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Cart } from '@/features/cart/domain/cart';
import { db } from '@/shared/db/client';
import { dishes, kitchens, messages, orderItems, orders } from '@/shared/db/schema';
import { customerActor } from '@/shared/db/test/actors';
import { makeAddress, makeKitchenWithMenu, makeOrder, truncateAll } from '@/shared/db/test/helpers';
import { env } from '@/shared/env';
import { getCartView } from '../queries';
import { placeOrder } from './place';

beforeEach(truncateAll);

const now = new Date('2026-10-15T13:00:00+05:30');

async function setup() {
  const menu = await makeKitchenWithMenu();
  const customer = await customerActor();
  const address = await makeAddress(customer.customerId, { riderNote: 'Ring twice', street: 'Main road' });
  const [veg, nonVeg] = menu.dishes;
  const cart: Cart = { v: 1, kitchenId: menu.kitchen.id, lines: [{ dishId: veg.id, qty: 2 }, { dishId: nonVeg.id, qty: 1 }] };
  const seenPrices = { [veg.id]: veg.priceRupees, [nonVeg.id]: nonVeg.priceRupees };
  const input = (extra: Record<string, unknown> = {}) => ({
    placeKey: crypto.randomUUID(),
    addressId: address.id,
    paymentMethod: 'cod',
    seenPrices: JSON.stringify(seenPrices),
    ...extra,
  });
  return { ...menu, customer, address, cart, input, veg, nonVeg };
}

describe('placeOrder (US1, FR-007 to FR-015)', () => {
  it('places a cash order with snapshots, the flat fee, the expected time and the first messages', async () => {
    const { customer, cart, input, kitchen, address } = await setup();
    const result = await placeOrder(customer, input(), cart, now);
    if (!result.ok) throw new Error(result.error.code);

    const [order] = await db.select().from(orders).where(eq(orders.id, result.data.orderId));
    expect(order).toMatchObject({
      status: 'placed',
      customerId: customer.customerId,
      kitchenId: kitchen.id,
      paymentMethod: 'cod',
      paymentReference: null,
      itemTotal: 2 * 60 + 180,
      deliveryFee: env.DELIVERY_FEE_RUPEES,
      grandTotal: 300 + env.DELIVERY_FEE_RUPEES,
      expectedAt: new Date(now.getTime() + (25 + env.DELIVERY_MINUTES) * 60_000),
      addressId: address.id,
      addrHouse: address.house,
      addrStreet: 'Main road',
      addrLandmark: address.landmark,
      addrRiderNote: 'Ring twice',
      addrLat: address.lat,
      addrLng: address.lng,
      placedAt: now,
    });
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order!.id)).orderBy(asc(orderItems.position));
    expect(items.map((i) => [i.nameEn, i.nameKn, i.isVeg, i.priceRupees, i.quantity, i.lineTotal])).toEqual([
      ['Neer dose', 'ನೀರ್ ದೋಸೆ', true, 60, 2, 120],
      ['Fish thali', 'ಮೀನು ಊಟ', false, 180, 1, 180],
    ]);
    const sent = await db.select().from(messages).where(eq(messages.orderId, order!.id));
    expect(sent.map((m) => [m.recipient, m.kind]).sort()).toEqual([
      ['customer', 'order_placed'],
      ['kitchen', 'kitchen_new_order'],
    ]);
  });

  it('treats the empty confirmation field of a cash order as not set', async () => {
    const { customer, cart, input } = await setup();
    expect((await placeOrder(customer, input({ upiConfirmed: '' }), cart, now)).ok).toBe(true);
  });

  it('needs the UPI confirmation, then records the stand-in reference', async () => {
    const { customer, cart, input } = await setup();
    expect(await placeOrder(customer, input({ paymentMethod: 'upi_demo' }), cart, now)).toMatchObject({
      ok: false,
      error: { code: 'upi_not_confirmed' },
    });
    const placed = await placeOrder(customer, input({ paymentMethod: 'upi_demo', upiConfirmed: 'true' }), cart, now);
    if (!placed.ok) throw new Error(placed.error.code);
    const [order] = await db.select().from(orders).where(eq(orders.id, placed.data.orderId));
    expect(order!.paymentReference).toBe(`DEMO-UPI-${order!.orderNo}`);
  });

  it('refuses when a dish became unavailable, was removed or changed price, and returns the corrected cart', async () => {
    const { customer, cart, input, veg, nonVeg, kitchen, category } = await setup();
    await db.update(dishes).set({ available: false }).where(eq(dishes.id, veg.id));
    await db.update(dishes).set({ priceRupees: 200 }).where(eq(dishes.id, nonVeg.id));
    const removedId = crypto.randomUUID();
    const withRemoved: Cart = { ...cart, lines: [...cart.lines, { dishId: removedId, qty: 1 }] };
    const result = await placeOrder(customer, input(), withRemoved, now);
    expect(result.ok).toBe(false);
    if (result.ok || result.error.code !== 'cart_changed' || !('changes' in result)) throw new Error('expected cart_changed');
    expect(result.changes).toEqual(
      expect.arrayContaining([
        { dishId: veg.id, kind: 'unavailable' },
        { dishId: removedId, kind: 'removed' },
        { dishId: nonVeg.id, kind: 'price', oldPrice: 180, newPrice: 200 },
      ]),
    );
    expect(result.cart).toEqual({ v: 1, kitchenId: kitchen.id, lines: [{ dishId: nonVeg.id, qty: 1 }] });
    expect(await db.$count(orders)).toBe(0);
    expect(category.kitchenId).toBe(kitchen.id);
  });

  it('refuses when the kitchen has closed, and clears the cart when it is no longer active', async () => {
    const { customer, cart, input, kitchen } = await setup();
    await db.update(kitchens).set({ closedAt: new Date(now.getTime() - 60_000) }).where(eq(kitchens.id, kitchen.id));
    expect(await placeOrder(customer, input(), cart, now)).toMatchObject({ ok: false, error: { code: 'kitchen_closed' } });
    await db.update(kitchens).set({ closedAt: null, status: 'suspended', suspensionReason: 'Review' }).where(eq(kitchens.id, kitchen.id));
    expect(await placeOrder(customer, input(), cart, now)).toMatchObject({ ok: false, error: { code: 'kitchen_unavailable' }, cart: null });
  });

  it('refuses an empty cart and another customer’s address', async () => {
    const { customer, cart, input } = await setup();
    expect(await placeOrder(customer, input(), null, now)).toMatchObject({ ok: false, error: { code: 'cart_empty' } });
    const stranger = await customerActor();
    expect(await placeOrder(stranger, input(), cart, now)).toMatchObject({ ok: false, error: { code: 'not_found' } });
  });

  it('places one order for one place key, even when sent twice (FR-013)', async () => {
    const { customer, cart, input } = await setup();
    const same = input();
    const [a, b] = await Promise.all([placeOrder(customer, same, cart, now), placeOrder(customer, same, cart, now)]);
    if (!a.ok || !b.ok) throw new Error('both should succeed');
    expect(a.data.orderId).toBe(b.data.orderId);
    // A retry after the cart was cleared still finds the order.
    const retry = await placeOrder(customer, same, null, now);
    expect(retry).toEqual({ ok: true, data: { orderId: a.data.orderId } });
    expect(await db.$count(orders)).toBe(1);
  });
});

describe('getCartView (FR-003, FR-009, FR-010)', () => {
  it('prices the cart from the database and preselects cash and the only address for a first order', async () => {
    const { customer, cart, address } = await setup();
    const view = await getCartView(cart, customer.customerId, now);
    expect(view!.bill).toEqual({ itemTotal: 300, deliveryFee: env.DELIVERY_FEE_RUPEES, grandTotal: 300 + env.DELIVERY_FEE_RUPEES });
    expect(view!.lines.map((l) => [l.qty, l.priceRupees, l.lineTotal])).toEqual([
      [2, 60, 120],
      [1, 180, 180],
    ]);
    expect(view!.preselected).toEqual({ addressId: address.id, paymentMethod: 'cod' });
  });

  it('preselects the address and payment method of the last order', async () => {
    const { customer, cart, kitchen } = await setup();
    const work = await makeAddress(customer.customerId, { label: 'work' });
    await makeOrder({ customerId: customer.customerId, kitchenId: kitchen.id, addressId: work.id, paymentMethod: 'upi_demo', placedAt: new Date(now.getTime() - 3600_000) });
    const view = await getCartView(cart, customer.customerId, now);
    expect(view!.preselected).toEqual({ addressId: work.id, paymentMethod: 'upi_demo' });
    expect(view!.addresses).toHaveLength(2);
  });

  it('flags lines that can no longer be ordered and leaves them out of the bill', async () => {
    const { cart, veg } = await setup();
    await db.update(dishes).set({ available: false }).where(eq(dishes.id, veg.id));
    const view = await getCartView(cart, null, now);
    expect(view!.lines.find((l) => l.dishId === veg.id)!.available).toBe(false);
    expect(view!.bill.itemTotal).toBe(180);
    expect(view!.addresses).toEqual([]);
  });

  it('is null for an empty cart', async () => {
    expect(await getCartView(null, null, now)).toBeNull();
  });
});
