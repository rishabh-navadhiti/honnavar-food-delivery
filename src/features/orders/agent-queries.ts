import 'server-only';
import { and, asc, eq, gte, lt, notInArray, or, sql } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { customers, kitchenContacts, kitchens, orderEvents, orderItems, orders } from '@/shared/db/schema';
import type { LocalizedPair } from '@/shared/i18n/localized';
import type { OrderStatus } from './domain/lifecycle';
import { istDayBounds } from './domain/today';
import type { OrderReason } from './services/transition';

const FINAL: OrderStatus[] = ['delivered', 'rejected', 'cancelled'];

export type AgentOrderCard = {
  id: string;
  orderNo: number;
  status: OrderStatus;
  statusChangedAt: Date;
  kitchen: { name: LocalizedPair; landmark: string };
  deliveryLandmark: string;
  paymentMethod: 'cod' | 'upi_demo';
  grandTotal: number;
};

/** The agent's unfinished orders, oldest first (FR-039). */
export async function listAgentOrders(agentId: string): Promise<AgentOrderCard[]> {
  const rows = await db
    .select({ order: orders, kitchen: kitchens })
    .from(orders)
    .innerJoin(kitchens, eq(kitchens.id, orders.kitchenId))
    .where(and(eq(orders.agentId, agentId), notInArray(orders.status, FINAL)))
    .orderBy(asc(orders.placedAt));
  return rows.map(({ order, kitchen }) => ({
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
    statusChangedAt: order.statusChangedAt,
    kitchen: { name: { en: kitchen.nameEn, kn: kitchen.nameKn }, landmark: kitchen.landmark },
    deliveryLandmark: order.addrLandmark,
    paymentMethod: order.paymentMethod,
    grandTotal: order.grandTotal,
  }));
}

/** Today's deliveries and cash collected, by delivery time in IST (FR-044). */
export async function getAgentToday(agentId: string, now: Date): Promise<{ deliveries: number; cashCollected: number }> {
  const { start, end } = istDayBounds(now);
  const [row] = await db
    .select({
      deliveries: sql<number>`count(*)::int`,
      cash: sql<number>`coalesce(sum(${orders.cashCollected}), 0)::int`,
    })
    .from(orders)
    .where(and(eq(orders.agentId, agentId), eq(orders.status, 'delivered'), gte(orders.finishedAt, start), lt(orders.finishedAt, end)));
  return { deliveries: row?.deliveries ?? 0, cashCollected: row?.cash ?? 0 };
}

export type AgentOrderDetail = {
  id: string;
  orderNo: number;
  status: OrderStatus;
  statusChangedAt: Date;
  paymentMethod: 'cod' | 'upi_demo';
  grandTotal: number;
  items: { name: LocalizedPair; quantity: number; isVeg: boolean }[];
  kitchen: { name: LocalizedPair; address: string; landmark: string; phone: string | null; location: { lat: number; lng: number } | null };
  customer: { name: string | null; phone: string };
  address: {
    label: 'home' | 'work' | 'other';
    labelText: string | null;
    house: string;
    street: string | null;
    landmark: string;
    riderNote: string | null;
    voiceNoteId: string | null;
    location: { lat: number; lng: number };
  };
};

export type AgentOrderView =
  | { state: 'mine'; order: AgentOrderDetail }
  | { state: 'reassigned'; orderNo: number }
  | { state: 'cancelled'; orderNo: number; reason: OrderReason | null; reasonNote: string | null };

/**
 * One order for the agent (FR-040): theirs now, or an explanation when it was reassigned away or
 * cancelled while they held it. Null for orders they never had (FR-049).
 */
export async function getAgentOrder(agentId: string, orderId: string): Promise<AgentOrderView | null> {
  const [row] = await db
    .select({ order: orders, kitchen: kitchens, customer: customers })
    .from(orders)
    .innerJoin(kitchens, eq(kitchens.id, orders.kitchenId))
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(eq(orders.id, orderId));
  if (!row) return null;
  const { order, kitchen, customer } = row;

  if (order.agentId !== agentId) {
    const held = await db.$count(
      orderEvents,
      and(eq(orderEvents.orderId, orderId), or(eq(orderEvents.agentId, agentId), eq(orderEvents.previousAgentId, agentId))),
    );
    return held > 0 ? { state: 'reassigned', orderNo: order.orderNo } : null;
  }
  if (order.status === 'cancelled') return { state: 'cancelled', orderNo: order.orderNo, reason: order.reason, reasonNote: order.reasonNote };

  const [items, contacts] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).orderBy(asc(orderItems.position)),
    db
      .select({ phone: kitchenContacts.phone })
      .from(kitchenContacts)
      .where(and(eq(kitchenContacts.kitchenId, kitchen.id), eq(kitchenContacts.isPrimary, true))),
  ]);
  return {
    state: 'mine',
    order: {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      statusChangedAt: order.statusChangedAt,
      paymentMethod: order.paymentMethod,
      grandTotal: order.grandTotal,
      items: items.map((i) => ({ name: { en: i.nameEn, kn: i.nameKn }, quantity: i.quantity, isVeg: i.isVeg })),
      kitchen: {
        name: { en: kitchen.nameEn, kn: kitchen.nameKn },
        address: kitchen.address,
        landmark: kitchen.landmark,
        phone: contacts[0]?.phone ?? null,
        location: kitchen.locationLat !== null && kitchen.locationLng !== null ? { lat: kitchen.locationLat, lng: kitchen.locationLng } : null,
      },
      customer: { name: customer.displayName, phone: customer.phone },
      address: {
        label: order.addrLabel,
        labelText: order.addrLabelText,
        house: order.addrHouse,
        street: order.addrStreet,
        landmark: order.addrLandmark,
        riderNote: order.addrRiderNote,
        voiceNoteId: order.addrVoiceNoteId,
        location: { lat: order.addrLat, lng: order.addrLng },
      },
    },
  };
}
