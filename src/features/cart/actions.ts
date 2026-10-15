'use server';

import { revalidatePath } from 'next/cache';
import { log } from '@/shared/log';
import type { ResultError } from '@/shared/result';
import { readCart, writeCart } from './cookie';
import { addToCart, setCartQuantity } from './services/cart';

export type CartActionState = { error?: ResultError; dishId?: string };

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
};

/**
 * Add one of a dish (FR-001). When the cart holds another kitchen's dishes the state carries
 * `other_kitchen`, and the form asks before resubmitting with `replace` (FR-002).
 */
export async function addToCartAction(_previous: CartActionState, formData: FormData): Promise<CartActionState> {
  const dishId = text(formData, 'dishId');
  try {
    const result = await addToCart(await readCart(), { dishId, replace: text(formData, 'replace') === 'true' }, new Date());
    if (!result.ok) return { error: result.error, dishId };
    await writeCart(result.data);
  } catch (error) {
    log.error('addToCartAction failed', { action: 'addToCartAction', surface: 'customer', subjectId: null, error });
    return { error: { code: 'unexpected' }, dishId };
  }
  revalidatePath('/', 'layout');
  return { dishId };
}

/** Change a dish's quantity; 0 removes it (FR-001). */
export async function setCartQuantityAction(_previous: CartActionState, formData: FormData): Promise<CartActionState> {
  const dishId = text(formData, 'dishId');
  try {
    const result = setCartQuantity(await readCart(), { dishId, qty: Number(text(formData, 'qty')) });
    if (!result.ok) return { error: result.error, dishId };
    await writeCart(result.data);
  } catch (error) {
    log.error('setCartQuantityAction failed', { action: 'setCartQuantityAction', surface: 'customer', subjectId: null, error });
    return { error: { code: 'unexpected' }, dishId };
  }
  revalidatePath('/', 'layout');
  return { dishId };
}

export async function clearCartAction(): Promise<void> {
  await writeCart(null);
  revalidatePath('/', 'layout');
}
