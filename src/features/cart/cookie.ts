import 'server-only';
import { cookies } from 'next/headers';
import { parseCartCookie, serialiseCart, type Cart } from './domain/cart';

export const CART_COOKIE = 'hfd_cart';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

/** The device's cart (research R1). Not tied to a session, so it survives sign-in (FR-005). */
export async function readCart(): Promise<Cart | null> {
  return parseCartCookie((await cookies()).get(CART_COOKIE)?.value);
}

/** Only callable from server actions and route handlers. An empty cart clears the cookie. */
export async function writeCart(cart: Cart | null): Promise<void> {
  const jar = await cookies();
  if (!cart) {
    jar.delete(CART_COOKIE);
    return;
  }
  jar.set(CART_COOKIE, serialiseCart(cart), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: THIRTY_DAYS,
  });
}
