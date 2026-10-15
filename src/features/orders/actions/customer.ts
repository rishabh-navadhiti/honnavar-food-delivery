'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { currentCustomer } from '@/features/auth/actor';
import { readCart, writeCart } from '@/features/cart/cookie';
import { log } from '@/shared/log';
import type { ResultError } from '@/shared/result';
import { cancelOrderByCustomer, reorder } from '../services/customer';
import { placeOrder, type CartChange } from '../services/place';

export type PlaceOrderState = { error?: ResultError; changes?: CartChange[] };

const FIELDS = ['placeKey', 'addressId', 'paymentMethod', 'upiConfirmed', 'seenPrices'];

/** Place the cart as an order and open its page (US1). Rewrites the cart when it changed (FR-012). */
export async function placeOrderAction(_previous: PlaceOrderState, formData: FormData): Promise<PlaceOrderState> {
  const actor = await currentCustomer();
  if (!actor) return { error: { code: 'unauthorised' } };
  const input = Object.fromEntries(FIELDS.map((name) => [name, formData.get(name) ?? undefined]));
  let orderId: string;
  try {
    const result = await placeOrder(actor, input, await readCart(), new Date());
    if (!result.ok) {
      if ('cart' in result) {
        await writeCart(result.cart);
        revalidatePath('/', 'layout');
      }
      return { error: result.error, changes: 'changes' in result ? result.changes : undefined };
    }
    orderId = result.data.orderId;
  } catch (error) {
    log.error('placeOrderAction failed', { action: 'placeOrderAction', surface: 'customer', subjectId: actor.customerId, error });
    return { error: { code: 'unexpected' } };
  }
  await writeCart(null);
  revalidatePath('/', 'layout');
  redirect(`/orders/${orderId}`);
}

export type CancelState = { error?: ResultError };

/** Cancel one's own order while it is still Placed (FR-027). */
export async function cancelOrderByCustomerAction(_previous: CancelState, formData: FormData): Promise<CancelState> {
  const actor = await currentCustomer();
  if (!actor) return { error: { code: 'unauthorised' } };
  const orderId = String(formData.get('orderId') ?? '');
  try {
    const result = await cancelOrderByCustomer(actor, { orderId }, new Date());
    if (!result.ok) return { error: result.error };
  } catch (error) {
    log.error('cancelOrderByCustomerAction failed', { action: 'cancelOrderByCustomerAction', surface: 'customer', subjectId: actor.customerId, error });
    return { error: { code: 'unexpected' } };
  }
  revalidatePath(`/orders/${orderId}`);
  return {};
}

export type ReorderState = { error?: ResultError };

/** Optional (FR-052): fill the cart from a past order, then open the cart. */
export async function reorderAction(_previous: ReorderState, formData: FormData): Promise<ReorderState> {
  const actor = await currentCustomer();
  if (!actor) return { error: { code: 'unauthorised' } };
  let leftOut = 0;
  try {
    const result = await reorder(actor, { orderId: formData.get('orderId'), replace: formData.get('replace') }, await readCart());
    if (!result.ok) return { error: result.error };
    await writeCart(result.data.cart);
    leftOut = result.data.leftOut.length;
  } catch (error) {
    log.error('reorderAction failed', { action: 'reorderAction', surface: 'customer', subjectId: actor.customerId, error });
    return { error: { code: 'unexpected' } };
  }
  revalidatePath('/', 'layout');
  redirect(leftOut > 0 ? `/cart?leftOut=${leftOut}` : '/cart');
}
