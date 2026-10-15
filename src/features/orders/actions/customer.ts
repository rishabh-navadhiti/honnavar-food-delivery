'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { currentCustomer } from '@/features/auth/actor';
import { readCart, writeCart } from '@/features/cart/cookie';
import { log } from '@/shared/log';
import type { ResultError } from '@/shared/result';
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
