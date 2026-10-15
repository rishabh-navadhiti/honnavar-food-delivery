import 'server-only';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { kitchenState } from '@/features/kitchens/domain/state';
import { loadWeekHours } from '@/features/kitchens/queries';
import { MAX_QUANTITY } from '@/features/orders/domain/bill';
import { db } from '@/shared/db/client';
import { dishes, kitchens } from '@/shared/db/schema';
import { err, ok, type Result } from '@/shared/result';
import { fields, parseInput } from '@/shared/validation';
import { addLine, setQuantity, type Cart } from '../domain/cart';

const addSchema = z.object({ dishId: fields.id(), replace: z.boolean().optional() });
const quantitySchema = z.object({ dishId: fields.id(), qty: z.number().int().min(0).max(MAX_QUANTITY) });

/**
 * Add one of a dish to the device cart (FR-001, FR-006): the dish must be available and its kitchen
 * active and open now. No session needed; the action owns reading and writing the cookie.
 */
export async function addToCart(cart: Cart | null, input: unknown, now: Date): Promise<Result<Cart>> {
  const parsed = parseInput(addSchema, input);
  if (!parsed.ok) return parsed;
  const { dishId, replace } = parsed.data;

  const [row] = await db
    .select({ kitchenId: dishes.kitchenId, available: dishes.available, closedAt: kitchens.closedAt, reopensAt: kitchens.reopensAt })
    .from(dishes)
    .innerJoin(kitchens, eq(kitchens.id, dishes.kitchenId))
    .where(and(eq(dishes.id, dishId), eq(kitchens.status, 'active')));
  if (!row || !row.available) return err('dish_unavailable');
  const week = (await loadWeekHours([row.kitchenId])).get(row.kitchenId)!;
  if (kitchenState({ closedAt: row.closedAt, reopensAt: row.reopensAt }, week, now).kind !== 'open') return err('kitchen_closed');

  const result = addLine(cart, row.kitchenId, dishId, { replace });
  if (result.ok) return ok(result.cart);
  if (result.code === 'other_kitchen') return err('other_kitchen', undefined, { kitchenId: result.kitchenId });
  return err(result.code);
}

/** Change a dish's quantity (0 removes it). Pure apart from validation. */
export function setCartQuantity(cart: Cart | null, input: unknown): Result<Cart | null> {
  const parsed = parseInput(quantitySchema, input);
  if (!parsed.ok) return parsed;
  const result = setQuantity(cart, parsed.data.dishId, parsed.data.qty);
  return result.ok ? ok(result.cart) : err(result.code);
}
