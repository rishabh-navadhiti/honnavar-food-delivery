import 'server-only';
import { and, asc, count, eq, gte, isNotNull, notInArray, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/shared/db/client';
import { agents, customers, kitchenContacts, kitchens, orderEvents, orderItems, orders } from '@/shared/db/schema';
import type { LocalizedPair } from '@/shared/i18n/localized';
import { DISPATCH_GROUPS, dispatchGroup, type DispatchGroup } from './domain/dispatch-group';
import { isFinal, type OrderEventKind, type OrderStatus } from './domain/lifecycle';
import { istDayBounds } from './domain/today';
import { expireOverdueOrders } from './services/expire';
import type { OrderReason } from './services/transition';

const FINAL: OrderStatus[] = ['delivered', 'rejected', 'cancelled'];

export type BoardOrder = {
  id: string;
  orderNo: number;
  status: OrderStatus;
  kitchen: LocalizedPair;
  landmark: string;
  grandTotal: number;
  paymentMethod: 'cod' | 'upi_demo';
  placedAt: Date;
  agentId: string | null;
  agentName: string | null;
};

export type BoardAgent = { id: string; name: string; undelivered: number };

export type DispatchBoard = { groups: Record<DispatchGroup, BoardOrder[]>; agents: BoardAgent[] };

/**
 * The dispatch board (FR-033): unfinished orders of any day plus orders finished today, grouped by
 * where they are; active agents with how many undelivered orders each holds (FR-034).
 */
export async function getDispatchBoard(now: Date): Promise<DispatchBoard> {
  await expireOverdueOrders(db, now, { all: true });
  const { start } = istDayBounds(now);
  const rows = await db
    .select({
      order: orders,
      kitchenEn: kitchens.nameEn,
      kitchenKn: kitchens.nameKn,
      agentName: agents.name,
    })
    .from(orders)
    .innerJoin(kitchens, eq(kitchens.id, orders.kitchenId))
    .leftJoin(agents, eq(agents.id, orders.agentId))
    .where(or(notInArray(orders.status, FINAL), and(isNotNull(orders.finishedAt), gte(orders.finishedAt, start))))
    .orderBy(asc(orders.placedAt));

  const groups = Object.fromEntries(DISPATCH_GROUPS.map((g) => [g, [] as BoardOrder[]])) as Record<DispatchGroup, BoardOrder[]>;
  for (const row of rows) {
    groups[dispatchGroup(row.order)].push({
      id: row.order.id,
      orderNo: row.order.orderNo,
      status: row.order.status,
      kitchen: { en: row.kitchenEn, kn: row.kitchenKn },
      landmark: row.order.addrLandmark,
      grandTotal: row.order.grandTotal,
      paymentMethod: row.order.paymentMethod,
      placedAt: row.order.placedAt,
      agentId: row.order.agentId,
      agentName: row.agentName,
    });
  }
  groups.finished.reverse();

  const held = await db
    .select({ agentId: orders.agentId, n: count() })
    .from(orders)
    .where(and(isNotNull(orders.agentId), notInArray(orders.status, FINAL)))
    .groupBy(orders.agentId);
  const active = await db.select({ id: agents.id, name: agents.name }).from(agents).where(eq(agents.active, true)).orderBy(asc(agents.name));
  return {
    groups,
    agents: active.map((a) => ({ ...a, undelivered: held.find((h) => h.agentId === a.id)?.n ?? 0 })),
  };
}

export type AdminOrderView = {
  id: string;
  orderNo: number;
  status: OrderStatus;
  finished: boolean;
  placedAt: Date;
  expectedAt: Date;
  paymentMethod: 'cod' | 'upi_demo';
  paymentReference: string | null;
  bill: { itemTotal: number; deliveryFee: number; grandTotal: number };
  cashCollected: number | null;
  items: { name: LocalizedPair; isVeg: boolean; priceRupees: number; quantity: number; lineTotal: number }[];
  customer: { name: string | null; phone: string };
  kitchen: { id: string; name: LocalizedPair; phone: string | null };
  address: {
    label: 'home' | 'work' | 'other';
    house: string;
    street: string | null;
    landmark: string;
    riderNote: string | null;
    voiceNoteId: string | null;
  };
  agent: { id: string; name: string; phone: string } | null;
  reason: OrderReason | null;
  reasonNote: string | null;
  events: {
    kind: OrderEventKind;
    actor: 'customer' | 'partner' | 'agent' | 'admin' | 'system';
    actorPhone: string | null;
    at: Date;
    reason: OrderReason | null;
    reasonNote: string | null;
    agentName: string | null;
    previousAgentName: string | null;
  }[];
};

/** Everything about one order, with its full history (FR-038, FR-018). */
export async function getAdminOrder(orderId: string, now: Date): Promise<AdminOrderView | null> {
  await expireOverdueOrders(db, now, { orderId });
  const [row] = await db
    .select({ order: orders, customer: customers, kitchen: kitchens })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .innerJoin(kitchens, eq(kitchens.id, orders.kitchenId))
    .where(eq(orders.id, orderId));
  if (!row) return null;
  const { order, customer, kitchen } = row;
  const previousAgent = alias(agents, 'previous_agent');
  const [items, events, agentRows, contacts] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).orderBy(asc(orderItems.position)),
    db
      .select({ event: orderEvents, agentName: agents.name, previousAgentName: previousAgent.name })
      .from(orderEvents)
      .leftJoin(agents, eq(agents.id, orderEvents.agentId))
      .leftJoin(previousAgent, eq(previousAgent.id, orderEvents.previousAgentId))
      .where(eq(orderEvents.orderId, order.id))
      .orderBy(asc(orderEvents.at)),
    order.agentId ? db.select({ id: agents.id, name: agents.name, phone: agents.phone }).from(agents).where(eq(agents.id, order.agentId)) : [],
    db
      .select({ phone: kitchenContacts.phone })
      .from(kitchenContacts)
      .where(and(eq(kitchenContacts.kitchenId, kitchen.id), eq(kitchenContacts.isPrimary, true))),
  ]);
  return {
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
    finished: isFinal(order.status),
    placedAt: order.placedAt,
    expectedAt: order.expectedAt,
    paymentMethod: order.paymentMethod,
    paymentReference: order.paymentReference,
    bill: { itemTotal: order.itemTotal, deliveryFee: order.deliveryFee, grandTotal: order.grandTotal },
    cashCollected: order.cashCollected,
    items: items.map((i) => ({ name: { en: i.nameEn, kn: i.nameKn }, isVeg: i.isVeg, priceRupees: i.priceRupees, quantity: i.quantity, lineTotal: i.lineTotal })),
    customer: { name: customer.displayName, phone: customer.phone },
    kitchen: { id: kitchen.id, name: { en: kitchen.nameEn, kn: kitchen.nameKn }, phone: contacts[0]?.phone ?? null },
    address: {
      label: order.addrLabel,
      house: order.addrHouse,
      street: order.addrStreet,
      landmark: order.addrLandmark,
      riderNote: order.addrRiderNote,
      voiceNoteId: order.addrVoiceNoteId,
    },
    agent: agentRows[0] ?? null,
    reason: order.reason,
    reasonNote: order.reasonNote,
    events: events.map(({ event, agentName, previousAgentName }) => ({
      kind: event.kind,
      actor: event.actor,
      actorPhone: event.actorPhone,
      at: event.at,
      reason: event.reason,
      reasonNote: event.reasonNote,
      agentName,
      previousAgentName,
    })),
  };
}

export async function findOrderByNumber(orderNo: number): Promise<string | null> {
  if (!Number.isSafeInteger(orderNo)) return null;
  const [row] = await db.select({ id: orders.id }).from(orders).where(eq(orders.orderNo, orderNo));
  return row?.id ?? null;
}

