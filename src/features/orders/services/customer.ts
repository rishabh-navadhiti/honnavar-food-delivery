import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import type { CustomerActor } from '@/features/auth/actor-scope';
import type { Cart } from '@/features/cart/domain/cart';
import { db } from '@/shared/db/client';
import { dishes, kitchens, orderItems, orders } from '@/shared/db/schema';
import type { LocalizedPair } from '@/shared/i18n/localized';
import { err, ok, type Result } from '@/shared/result';
import { fields, parseInput } from '@/shared/validation';
import { orderIdSchema } from '../schemas';
import { applyTransition, type TransitionOutcome } from './transition';

/** A customer cancels their own order while it is still Placed; no reason is asked (FR-027). */
export async function cancelOrderByCustomer(actor: CustomerActor, input: unknown, now: Date): Promise<Result<TransitionOutcome>> {
  const parsed = parseInput(orderIdSchema, input);
  if (!parsed.ok) return parsed;
  return applyTransition({ orderId: parsed.data.orderId, action: { type: 'cancel' }, actor, now });
}

const reorderSchema = z.object({
  orderId: fields.id(),
  replace: z.preprocess((v) => v === 'true' || v === true, z.boolean()).optional(),
});

/**
 * Optional (FR-052): a cart with this order's dishes that are still available, at today's prices
 * (the cart never holds prices). Dishes no longer available are left out and named.
 */
export async function reorder(
  actor: CustomerActor,
  input: unknown,
  currentCart: Cart | null,
): Promise<Result<{ cart: Cart; leftOut: LocalizedPair[] }>> {
  const parsed = parseInput(reorderSchema, input);
  if (!parsed.ok) return parsed;
  const [order] = await db
    .select({ id: orders.id, kitchenId: orders.kitchenId, kitchenStatus: kitchens.status })
    .from(orders)
    .innerJoin(kitchens, eq(kitchens.id, orders.kitchenId))
    .where(and(eq(orders.id, parsed.data.orderId), eq(orders.customerId, actor.customerId)));
  if (!order) return err('not_found');
  if (order.kitchenStatus !== 'active') return err('kitchen_unavailable');
  if (currentCart && currentCart.kitchenId !== order.kitchenId && !parsed.data.replace) {
    return err('other_kitchen', undefined, { kitchenId: currentCart.kitchenId });
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).orderBy(asc(orderItems.position));
  const ids = items.map((i) => i.dishId).filter((id): id is string => Boolean(id));
  const live = ids.length > 0 ? await db.select().from(dishes).where(and(inArray(dishes.id, ids), eq(dishes.kitchenId, order.kitchenId))) : [];
  const lines: Cart['lines'] = [];
  const leftOut: LocalizedPair[] = [];
  for (const item of items) {
    const dish = live.find((d) => d.id === item.dishId);
    if (dish?.available) lines.push({ dishId: dish.id, qty: item.quantity });
    else leftOut.push({ en: item.nameEn, kn: item.nameKn });
  }
  if (lines.length === 0) return err('nothing_to_reorder');
  return ok({ cart: { v: 1, kitchenId: order.kitchenId, lines }, leftOut });
}
