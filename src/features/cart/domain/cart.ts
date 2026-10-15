import { z } from 'zod';
import { MAX_QUANTITY } from '@/features/orders/domain/bill';

/**
 * The cart lives in the `hfd_cart` cookie (research R1): dish ids and quantities for one kitchen,
 * never prices. Pure, so the kitchen page, cart page and checkout share one set of rules.
 */
export const MAX_LINES = 30;

const cartSchema = z.object({
  v: z.literal(1),
  kitchenId: z.uuid(),
  lines: z
    .array(z.object({ dishId: z.uuid(), qty: z.number().int().min(1).max(MAX_QUANTITY) }))
    .min(1)
    .max(MAX_LINES)
    .refine((lines) => new Set(lines.map((l) => l.dishId)).size === lines.length),
});

export type Cart = z.infer<typeof cartSchema>;
export type CartLine = Cart['lines'][number];

export type CartResult = { ok: true; cart: Cart | null } | { ok: false; code: 'quantity_limit' };
export type AddResult =
  | { ok: true; cart: Cart }
  | { ok: false; code: 'other_kitchen'; kitchenId: string }
  | { ok: false; code: 'quantity_limit' | 'cart_full' };

/** Parse the cookie value; anything that is not a valid cart is an empty cart (fails closed). */
export function parseCartCookie(raw: string | undefined): Cart | null {
  if (!raw) return null;
  try {
    const parsed = cartSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function serialiseCart(cart: Cart): string {
  return JSON.stringify(cart);
}

export function cartCount(cart: Cart | null): number {
  return cart ? cart.lines.reduce((sum, line) => sum + line.qty, 0) : 0;
}

/** Add one of a dish. A dish from another kitchen needs `replace`, which empties the cart first (FR-002). */
export function addLine(cart: Cart | null, kitchenId: string, dishId: string, options: { replace?: boolean } = {}): AddResult {
  if (cart && cart.kitchenId !== kitchenId) {
    if (!options.replace) return { ok: false, code: 'other_kitchen', kitchenId: cart.kitchenId };
    cart = null;
  }
  const lines = cart?.lines ?? [];
  const existing = lines.find((l) => l.dishId === dishId);
  if (existing) {
    if (existing.qty >= MAX_QUANTITY) return { ok: false, code: 'quantity_limit' };
    return { ok: true, cart: { v: 1, kitchenId, lines: lines.map((l) => (l.dishId === dishId ? { ...l, qty: l.qty + 1 } : l)) } };
  }
  if (lines.length >= MAX_LINES) return { ok: false, code: 'cart_full' };
  return { ok: true, cart: { v: 1, kitchenId, lines: [...lines, { dishId, qty: 1 }] } };
}

/** Set a dish's quantity; 0 removes it, and removing the last line empties the cart. */
export function setQuantity(cart: Cart | null, dishId: string, qty: number): CartResult {
  if (!Number.isInteger(qty) || qty < 0 || qty > MAX_QUANTITY) return { ok: false, code: 'quantity_limit' };
  if (!cart || !cart.lines.some((l) => l.dishId === dishId)) return { ok: true, cart };
  const lines = qty === 0 ? cart.lines.filter((l) => l.dishId !== dishId) : cart.lines.map((l) => (l.dishId === dishId ? { ...l, qty } : l));
  return { ok: true, cart: lines.length > 0 ? { ...cart, lines } : null };
}

/** Drop lines (for example dishes that became unavailable); an emptied cart becomes null. */
export function withoutDishes(cart: Cart, dishIds: ReadonlySet<string>): Cart | null {
  const lines = cart.lines.filter((l) => !dishIds.has(l.dishId));
  return lines.length > 0 ? { ...cart, lines } : null;
}
