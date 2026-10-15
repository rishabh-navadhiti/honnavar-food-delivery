import 'server-only';
import { and, asc, desc, eq, inArray, notInArray } from 'drizzle-orm';
import type { Cart } from '@/features/cart/domain/cart';
import { kitchenState, type KitchenState } from '@/features/kitchens/domain/state';
import { loadWeekHours } from '@/features/kitchens/queries';
import { db } from '@/shared/db/client';
import { agents, customerAddresses, dishes, kitchenContacts, kitchens, orderEvents, orderItems, orders } from '@/shared/db/schema';
import { env } from '@/shared/env';
import type { LocalizedPair } from '@/shared/i18n/localized';
import { bill } from './domain/bill';
import { etaRange } from './domain/eta';
import { isFinal, type OrderEventKind, type OrderStatus } from './domain/lifecycle';
import { expireOverdueOrders } from './services/expire';
import type { OrderReason } from './services/transition';

export type SavedAddress = typeof customerAddresses.$inferSelect;

export type CartLineView = {
  dishId: string;
  name: LocalizedPair;
  isVeg: boolean;
  priceRupees: number;
  qty: number;
  lineTotal: number;
  available: boolean;
};

export type CartView = {
  kitchen: { id: string; name: LocalizedPair; state: KitchenState; active: boolean; eta: { from: number; to: number } };
  lines: CartLineView[];
  /** Cart lines whose dish no longer exists. */
  removedCount: number;
  bill: { itemTotal: number; deliveryFee: number; grandTotal: number };
  addresses: SavedAddress[];
  preselected: { addressId: string | null; paymentMethod: 'cod' | 'upi_demo' };
};

/**
 * The cart priced from the database (prices never come from the cookie), plus the customer's saved
 * addresses with the last order's address and payment preselected (FR-003, FR-009, FR-010).
 */
export async function getCartView(cart: Cart | null, customerId: string | null, now: Date): Promise<CartView | null> {
  if (!cart) return null;
  const [kitchen] = await db.select().from(kitchens).where(eq(kitchens.id, cart.kitchenId));
  if (!kitchen) return null;
  const week = (await loadWeekHours([kitchen.id])).get(kitchen.id)!;
  const rows = await db
    .select()
    .from(dishes)
    .where(and(inArray(dishes.id, cart.lines.map((l) => l.dishId)), eq(dishes.kitchenId, kitchen.id)));
  const byId = new Map(rows.map((d) => [d.id, d]));

  const lines: CartLineView[] = cart.lines.flatMap((line) => {
    const dish = byId.get(line.dishId);
    if (!dish) return [];
    return [
      {
        dishId: dish.id,
        name: { en: dish.nameEn, kn: dish.nameKn },
        isVeg: dish.isVeg,
        priceRupees: dish.priceRupees,
        qty: line.qty,
        lineTotal: dish.priceRupees * line.qty,
        available: dish.available,
      },
    ];
  });
  const totals = bill(
    lines.filter((l) => l.available).map((l) => ({ priceRupees: l.priceRupees, quantity: l.qty })),
    env.DELIVERY_FEE_RUPEES,
  );

  let addresses: SavedAddress[] = [];
  let preselected: CartView['preselected'] = { addressId: null, paymentMethod: 'cod' };
  if (customerId) {
    addresses = await db
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.customerId, customerId))
      .orderBy(asc(customerAddresses.createdAt));
    const [last] = await db
      .select({ addressId: orders.addressId, paymentMethod: orders.paymentMethod })
      .from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.placedAt))
      .limit(1);
    const lastAddress = last?.addressId && addresses.some((a) => a.id === last.addressId) ? last.addressId : null;
    preselected = { addressId: lastAddress ?? addresses[0]?.id ?? null, paymentMethod: last?.paymentMethod ?? 'cod' };
  }

  return {
    kitchen: {
      id: kitchen.id,
      name: { en: kitchen.nameEn, kn: kitchen.nameKn },
      state: kitchenState({ closedAt: kitchen.closedAt, reopensAt: kitchen.reopensAt }, week, now),
      active: kitchen.status === 'active',
      eta: etaRange(kitchen.prepMinutes, env.DELIVERY_MINUTES),
    },
    lines,
    removedCount: cart.lines.length - lines.length,
    bill: { itemTotal: totals.itemTotal, deliveryFee: totals.deliveryFee, grandTotal: totals.grandTotal },
    addresses,
    preselected,
  };
}

export type OrderItemView = { name: LocalizedPair; isVeg: boolean; priceRupees: number; quantity: number; lineTotal: number };

export type CustomerOrderView = {
  id: string;
  orderNo: number;
  status: OrderStatus;
  finished: boolean;
  placedAt: Date;
  expectedAt: Date;
  paymentMethod: 'cod' | 'upi_demo';
  bill: { itemTotal: number; deliveryFee: number; grandTotal: number };
  items: OrderItemView[];
  kitchen: { id: string; name: LocalizedPair; phone: string | null; location: { lat: number; lng: number } | null };
  address: {
    label: 'home' | 'work' | 'other';
    house: string;
    street: string | null;
    landmark: string;
    riderNote: string | null;
    location: { lat: number; lng: number };
  };
  agent: { name: string; phone: string } | null;
  reason: OrderReason | null;
  reasonNote: string | null;
  events: { kind: OrderEventKind; at: Date; reason: OrderReason | null }[];
};

async function primaryPhone(kitchenId: string): Promise<string | null> {
  const [row] = await db
    .select({ phone: kitchenContacts.phone })
    .from(kitchenContacts)
    .where(and(eq(kitchenContacts.kitchenId, kitchenId), eq(kitchenContacts.isPrimary, true)));
  return row?.phone ?? null;
}

/** One of the customer's own orders (FR-025), after lazy expiry; null for anyone else's (FR-049). */
export async function getCustomerOrder(customerId: string, orderId: string, now: Date): Promise<CustomerOrderView | null> {
  await expireOverdueOrders(db, now, { orderId });
  const [row] = await db
    .select({ order: orders, kitchen: kitchens })
    .from(orders)
    .innerJoin(kitchens, eq(kitchens.id, orders.kitchenId))
    .where(and(eq(orders.id, orderId), eq(orders.customerId, customerId)));
  if (!row) return null;
  const { order, kitchen } = row;
  const [items, events, agentRows, phone] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).orderBy(asc(orderItems.position)),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, order.id)).orderBy(asc(orderEvents.at)),
    order.agentId ? db.select({ name: agents.name, phone: agents.phone }).from(agents).where(eq(agents.id, order.agentId)) : [],
    primaryPhone(kitchen.id),
  ]);
  return {
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
    finished: isFinal(order.status),
    placedAt: order.placedAt,
    expectedAt: order.expectedAt,
    paymentMethod: order.paymentMethod,
    bill: { itemTotal: order.itemTotal, deliveryFee: order.deliveryFee, grandTotal: order.grandTotal },
    items: items.map((i) => ({
      name: { en: i.nameEn, kn: i.nameKn },
      isVeg: i.isVeg,
      priceRupees: i.priceRupees,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
    })),
    kitchen: {
      id: kitchen.id,
      name: { en: kitchen.nameEn, kn: kitchen.nameKn },
      phone,
      location: kitchen.locationLat !== null && kitchen.locationLng !== null ? { lat: kitchen.locationLat, lng: kitchen.locationLng } : null,
    },
    address: {
      label: order.addrLabel,
      house: order.addrHouse,
      street: order.addrStreet,
      landmark: order.addrLandmark,
      riderNote: order.addrRiderNote,
      location: { lat: order.addrLat, lng: order.addrLng },
    },
    agent: agentRows[0] ?? null,
    reason: order.reason,
    reasonNote: order.reasonNote,
    events: events.map((e) => ({ kind: e.kind, at: e.at, reason: e.reason })),
  };
}

export type CustomerOrderSummary = {
  id: string;
  orderNo: number;
  status: OrderStatus;
  finished: boolean;
  placedAt: Date;
  grandTotal: number;
  kitchen: { id: string; name: LocalizedPair };
};

/** The customer's orders: ongoing first, then past ones, newest first within each (FR-024). */
export async function listCustomerOrders(customerId: string, now: Date): Promise<CustomerOrderSummary[]> {
  await expireOverdueOrders(db, now, { customerId });
  const rows = await db
    .select({ order: orders, kitchen: { id: kitchens.id, nameEn: kitchens.nameEn, nameKn: kitchens.nameKn } })
    .from(orders)
    .innerJoin(kitchens, eq(kitchens.id, orders.kitchenId))
    .where(eq(orders.customerId, customerId))
    .orderBy(desc(orders.placedAt))
    .limit(100);
  const list = rows.map(({ order, kitchen }) => ({
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
    finished: isFinal(order.status),
    placedAt: order.placedAt,
    grandTotal: order.grandTotal,
    kitchen: { id: kitchen.id, name: { en: kitchen.nameEn, kn: kitchen.nameKn } },
  }));
  return [...list.filter((o) => !o.finished), ...list.filter((o) => o.finished)];
}

export type OngoingOrder = { id: string; orderNo: number; status: OrderStatus; kitchenName: LocalizedPair };

/** The customer's most recent unfinished order, for the strip on customer screens (FR-024). */
export async function getOngoingOrder(customerId: string, now: Date): Promise<OngoingOrder | null> {
  await expireOverdueOrders(db, now, { customerId });
  const [row] = await db
    .select({ id: orders.id, orderNo: orders.orderNo, status: orders.status, nameEn: kitchens.nameEn, nameKn: kitchens.nameKn })
    .from(orders)
    .innerJoin(kitchens, eq(kitchens.id, orders.kitchenId))
    .where(and(eq(orders.customerId, customerId), notInArray(orders.status, ['delivered', 'rejected', 'cancelled'])))
    .orderBy(desc(orders.placedAt))
    .limit(1);
  return row ? { id: row.id, orderNo: row.orderNo, status: row.status, kitchenName: { en: row.nameEn, kn: row.nameKn } } : null;
}
