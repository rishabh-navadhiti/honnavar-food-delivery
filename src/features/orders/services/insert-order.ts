import 'server-only';
import { eq } from 'drizzle-orm';
import { messagesFor } from '@/features/notifications/domain/messages-for';
import { notifier } from '@/shared/adapters/notifications';
import { paymentProvider } from '@/shared/adapters/payment';
import type { Executor } from '@/shared/db/client';
import { orderEvents, orderItems, orders } from '@/shared/db/schema';
import { bill } from '../domain/bill';
import { expectedAt } from '../domain/eta';

export type NewOrderItem = {
  dishId: string;
  nameEn: string | null;
  nameKn: string | null;
  isVeg: boolean;
  priceRupees: number;
  quantity: number;
};

export type AddressSnapshot = {
  id: string | null;
  label: 'home' | 'work' | 'other';
  house: string;
  street: string | null;
  landmark: string;
  riderNote: string | null;
  lat: number;
  lng: number;
  geocodedText: string | null;
  voiceNoteId: string | null;
};

export type NewOrder = {
  id?: string;
  customerId: string;
  customerPhone: string;
  kitchenId: string;
  placeKey: string;
  paymentMethod: 'cod' | 'upi_demo';
  items: NewOrderItem[];
  deliveryFee: number;
  prepMinutes: number;
  deliveryMinutes: number;
  address: AddressSnapshot;
  placedAt: Date;
};

/**
 * Insert a Placed order with its item and address snapshots (FR-014), expected time (FR-058),
 * `placed` event and messages, inside the caller's transaction. Used by checkout and the demo seed,
 * so seeded orders are made exactly like live ones. A UPI order is confirmed through the payment
 * adapter (stand-in) once its number is known.
 */
export async function insertPlacedOrder(tx: Executor, input: NewOrder): Promise<{ id: string; orderNo: number; grandTotal: number }> {
  const totals = bill(input.items, input.deliveryFee);
  const [order] = await tx
    .insert(orders)
    .values({
      ...(input.id ? { id: input.id } : {}),
      customerId: input.customerId,
      kitchenId: input.kitchenId,
      placeKey: input.placeKey,
      status: 'placed',
      paymentMethod: input.paymentMethod,
      itemTotal: totals.itemTotal,
      deliveryFee: totals.deliveryFee,
      grandTotal: totals.grandTotal,
      expectedAt: expectedAt(input.placedAt, input.prepMinutes, input.deliveryMinutes),
      addressId: input.address.id,
      addrLabel: input.address.label,
      addrHouse: input.address.house,
      addrStreet: input.address.street,
      addrLandmark: input.address.landmark,
      addrRiderNote: input.address.riderNote,
      addrLat: input.address.lat,
      addrLng: input.address.lng,
      addrGeocodedText: input.address.geocodedText,
      addrVoiceNoteId: input.address.voiceNoteId,
      placedAt: input.placedAt,
      statusChangedAt: input.placedAt,
    })
    .returning({ id: orders.id, orderNo: orders.orderNo, grandTotal: orders.grandTotal });
  const created = order!;

  await tx.insert(orderItems).values(
    totals.lines.map((line, position) => ({
      orderId: created.id,
      position,
      dishId: line.dishId,
      nameEn: line.nameEn,
      nameKn: line.nameKn,
      isVeg: line.isVeg,
      priceRupees: line.priceRupees,
      quantity: line.quantity,
      lineTotal: line.lineTotal,
    })),
  );

  if (input.paymentMethod === 'upi_demo') {
    const payment = await paymentProvider.confirmUpi({ orderRef: String(created.orderNo), amountRupees: created.grandTotal });
    if (payment.status !== 'succeeded') throw new PaymentFailed(payment.reason);
    await tx.update(orders).set({ paymentReference: payment.reference }).where(eq(orders.id, created.id));
  }

  await tx.insert(orderEvents).values({
    orderId: created.id,
    kind: 'placed',
    actor: 'customer',
    actorPhone: input.customerPhone,
    at: input.placedAt,
  });
  const messageOrder = { ...created, customerId: input.customerId, kitchenId: input.kitchenId, agentId: null };
  for (const message of messagesFor({ kind: 'placed' }, messageOrder)) await notifier.notify(tx, message, input.placedAt);
  return created;
}

/** A real payment provider's refusal; the stand-in never throws it. Rolls the order back. */
export class PaymentFailed extends Error {
  constructor(readonly reason: 'declined' | 'unavailable') {
    super(`UPI payment ${reason}`);
  }
}
