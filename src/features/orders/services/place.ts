import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import type { CustomerActor } from '@/features/auth/actor-scope';
import { withoutDishes, type Cart } from '@/features/cart/domain/cart';
import { kitchenState } from '@/features/kitchens/domain/state';
import { loadWeekHours } from '@/features/kitchens/queries';
import { db } from '@/shared/db/client';
import { customerAddresses, dishes, kitchens, orders } from '@/shared/db/schema';
import { env } from '@/shared/env';
import { err, ok, type Result, type ResultError } from '@/shared/result';
import { fields, parseInput } from '@/shared/validation';
import { insertPlacedOrder } from './insert-order';

export type CartChange =
  | { dishId: string; kind: 'unavailable' | 'removed' }
  | { dishId: string; kind: 'price'; oldPrice: number; newPrice: number };

/** On `cart_changed` and `kitchen_unavailable` the action rewrites the cart cookie with `cart`. */
export type PlaceResult =
  | Result<{ orderId: string }>
  | { ok: false; error: ResultError; cart: Cart | null; changes?: CartChange[] };

const json = z.preprocess((v) => {
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return undefined;
  }
}, z.record(z.uuid(), z.number().int()));

const placeSchema = z.object({
  placeKey: fields.id(),
  addressId: fields.id(),
  paymentMethod: z.enum(['cod', 'upi_demo'], { error: 'required' }),
  /** Set by the UPI demo sheet; an empty form field means not confirmed. */
  upiConfirmed: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.union([z.literal('true'), z.literal(true)]).optional()),
  /** The prices the customer saw on the cart page, so a price change is never charged silently. */
  seenPrices: json,
});

/**
 * Place the cart as an order (FR-007 to FR-015). Safe to repeat: the same place key returns the
 * same order (FR-013). Re-checks the kitchen and every dish at placing time (FR-012).
 */
export async function placeOrder(actor: CustomerActor, input: unknown, cart: Cart | null, now: Date): Promise<PlaceResult> {
  const parsed = parseInput(placeSchema, input);
  if (!parsed.ok) return parsed;
  const { placeKey, addressId, paymentMethod, upiConfirmed, seenPrices } = parsed.data;

  const existing = await findByPlaceKey(actor.customerId, placeKey);
  if (existing) return ok({ orderId: existing });
  if (!cart) return err('cart_empty');

  const [address] = await db
    .select()
    .from(customerAddresses)
    .where(and(eq(customerAddresses.id, addressId), eq(customerAddresses.customerId, actor.customerId)));
  if (!address) return err('not_found');
  if (paymentMethod === 'upi_demo' && !upiConfirmed) return err('upi_not_confirmed');

  const [kitchen] = await db.select().from(kitchens).where(eq(kitchens.id, cart.kitchenId));
  if (!kitchen || kitchen.status !== 'active') return { ok: false, error: { code: 'kitchen_unavailable' }, cart: null };
  const week = (await loadWeekHours([kitchen.id])).get(kitchen.id)!;
  const state = kitchenState({ closedAt: kitchen.closedAt, reopensAt: kitchen.reopensAt }, week, now);
  if (state.kind !== 'open') return err('kitchen_closed');

  const rows = await db
    .select()
    .from(dishes)
    .where(and(inArray(dishes.id, cart.lines.map((l) => l.dishId)), eq(dishes.kitchenId, kitchen.id)));
  const byId = new Map(rows.map((d) => [d.id, d]));
  const changes: CartChange[] = [];
  for (const line of cart.lines) {
    const dish = byId.get(line.dishId);
    if (!dish) changes.push({ dishId: line.dishId, kind: 'removed' });
    else if (!dish.available) changes.push({ dishId: line.dishId, kind: 'unavailable' });
    else if (seenPrices[line.dishId] !== dish.priceRupees) {
      changes.push({ dishId: line.dishId, kind: 'price', oldPrice: seenPrices[line.dishId] ?? 0, newPrice: dish.priceRupees });
    }
  }
  if (changes.length > 0) {
    const gone = new Set(changes.filter((c) => c.kind !== 'price').map((c) => c.dishId));
    return { ok: false, error: { code: 'cart_changed' }, cart: withoutDishes(cart, gone), changes };
  }

  try {
    const created = await db.transaction((tx) =>
      insertPlacedOrder(tx, {
        customerId: actor.customerId,
        customerPhone: actor.phone,
        kitchenId: kitchen.id,
        placeKey,
        paymentMethod,
        items: cart.lines.map((line) => {
          const dish = byId.get(line.dishId)!;
          return { dishId: dish.id, nameEn: dish.nameEn, nameKn: dish.nameKn, isVeg: dish.isVeg, priceRupees: dish.priceRupees, quantity: line.qty };
        }),
        deliveryFee: env.DELIVERY_FEE_RUPEES,
        prepMinutes: kitchen.prepMinutes,
        deliveryMinutes: env.DELIVERY_MINUTES,
        address: {
          id: address.id,
          label: address.label,
          labelText: address.labelText,
          house: address.house,
          street: address.street,
          landmark: address.landmark,
          riderNote: address.riderNote,
          lat: address.lat,
          lng: address.lng,
          geocodedText: address.geocodedText,
          voiceNoteId: address.voiceNoteId,
        },
        placedAt: now,
      }),
    );
    return ok({ orderId: created.id });
  } catch (error) {
    // A concurrent request with the same place key won the unique index: return its order.
    const raced = await findByPlaceKey(actor.customerId, placeKey);
    if (raced) return ok({ orderId: raced });
    throw error;
  }
}

async function findByPlaceKey(customerId: string, placeKey: string): Promise<string | null> {
  const [row] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.customerId, customerId), eq(orders.placeKey, placeKey)));
  return row?.id ?? null;
}
