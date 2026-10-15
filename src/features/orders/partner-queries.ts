import 'server-only';
import { and, asc, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { customers, orderEvents, orderItems, orders } from '@/shared/db/schema';
import { env } from '@/shared/env';
import type { LocalizedPair } from '@/shared/i18n/localized';
import { timeLeftMs } from './domain/expiry';
import { isFinal, type OrderStatus } from './domain/lifecycle';
import { istDayBounds } from './domain/today';
import { expireOverdueOrders } from './services/expire';
import type { OrderReason } from './services/transition';

const OPEN: OrderStatus[] = ['placed', 'accepted', 'preparing', 'ready', 'picked_up'];

/**
 * What a partner sees of an order (FR-028). Privacy (FR-032): the customer's display name, the
 * landmark and the rider note, never their phone, house or street.
 */
export type PartnerOrderView = {
  id: string;
  orderNo: number;
  status: OrderStatus;
  finished: boolean;
  placedAt: Date;
  statusChangedAt: Date;
  /** Milliseconds left to accept a Placed order; null otherwise (FR-020). */
  timeLeftMs: number | null;
  items: { name: LocalizedPair; quantity: number; isVeg: boolean }[];
  itemTotal: number;
  paymentMethod: 'cod' | 'upi_demo';
  customerName: string | null;
  landmark: string;
  riderNote: string | null;
  reason: OrderReason | null;
  reasonNote: string | null;
  cancelledBy: 'customer' | 'admin' | 'partner' | 'agent' | 'system' | null;
};

async function views(rows: { order: typeof orders.$inferSelect; customerName: string | null }[], now: Date): Promise<PartnerOrderView[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.order.id);
  const [items, cancellations] = await Promise.all([
    db.select().from(orderItems).where(inArray(orderItems.orderId, ids)).orderBy(asc(orderItems.position)),
    db
      .select({ orderId: orderEvents.orderId, actor: orderEvents.actor })
      .from(orderEvents)
      .where(and(inArray(orderEvents.orderId, ids), eq(orderEvents.kind, 'cancelled'))),
  ]);
  return rows.map(({ order, customerName }) => ({
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
    finished: isFinal(order.status),
    placedAt: order.placedAt,
    statusChangedAt: order.statusChangedAt,
    timeLeftMs: order.status === 'placed' ? timeLeftMs(order.placedAt, now, env.ACCEPT_WINDOW_MINUTES) : null,
    items: items
      .filter((i) => i.orderId === order.id)
      .map((i) => ({ name: { en: i.nameEn, kn: i.nameKn }, quantity: i.quantity, isVeg: i.isVeg })),
    itemTotal: order.itemTotal,
    paymentMethod: order.paymentMethod,
    customerName,
    landmark: order.addrLandmark,
    riderNote: order.addrRiderNote,
    reason: order.reason,
    reasonNote: order.reasonNote,
    cancelledBy: cancellations.find((c) => c.orderId === order.id)?.actor ?? null,
  }));
}

const select = { order: orders, customerName: customers.displayName };

/** The kitchen's open orders, newest first (FR-028). */
export async function listPartnerOrders(kitchenId: string, now: Date): Promise<PartnerOrderView[]> {
  await expireOverdueOrders(db, now, { kitchenId });
  const rows = await db
    .select(select)
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(and(eq(orders.kitchenId, kitchenId), inArray(orders.status, OPEN)))
    .orderBy(desc(orders.placedAt));
  return views(rows, now);
}

/** One order of the partner's kitchen, or null (another kitchen's order is not found). */
export async function getPartnerOrder(kitchenId: string, orderId: string, now: Date): Promise<PartnerOrderView | null> {
  await expireOverdueOrders(db, now, { orderId });
  const rows = await db
    .select(select)
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(and(eq(orders.id, orderId), eq(orders.kitchenId, kitchenId)));
  return (await views(rows, now))[0] ?? null;
}

export type PartnerDay = {
  orders: PartnerOrderView[];
  totals: { received: number; accepted: number; rejectedOrCancelled: number; delivered: number; deliveredValue: number };
};

/** Today's orders (IST) and totals (FR-031). "Accepted" counts every order the kitchen accepted. */
export async function getPartnerDay(kitchenId: string, now: Date): Promise<PartnerDay> {
  await expireOverdueOrders(db, now, { kitchenId });
  const { start, end } = istDayBounds(now);
  const rows = await db
    .select({
      ...select,
      wasAccepted: sql<boolean>`exists (select 1 from order_events e where e.order_id = ${orders.id} and e.kind = 'accepted')`,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(and(eq(orders.kitchenId, kitchenId), gte(orders.placedAt, start), lt(orders.placedAt, end)))
    .orderBy(desc(orders.placedAt));
  const acceptedStatuses: OrderStatus[] = ['accepted', 'preparing', 'ready', 'picked_up', 'delivered'];
  const delivered = rows.filter((r) => r.order.status === 'delivered');
  return {
    orders: await views(rows, now),
    totals: {
      received: rows.length,
      accepted: rows.filter((r) => acceptedStatuses.includes(r.order.status) || r.wasAccepted).length,
      rejectedOrCancelled: rows.filter((r) => r.order.status === 'rejected' || r.order.status === 'cancelled').length,
      delivered: delivered.length,
      deliveredValue: delivered.reduce((sum, r) => sum + r.order.itemTotal, 0),
    },
  };
}

/** Placed orders for the new-order alert (FR-029), after lazy expiry. */
export async function getNewOrderFeed(kitchenId: string, now: Date): Promise<{ id: string; orderNo: number; placedAt: Date }[]> {
  await expireOverdueOrders(db, now, { kitchenId });
  return db
    .select({ id: orders.id, orderNo: orders.orderNo, placedAt: orders.placedAt })
    .from(orders)
    .where(and(eq(orders.kitchenId, kitchenId), eq(orders.status, 'placed')))
    .orderBy(asc(orders.placedAt));
}
