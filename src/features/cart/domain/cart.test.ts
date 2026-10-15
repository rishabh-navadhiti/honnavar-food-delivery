import { describe, expect, it } from 'vitest';
import { addLine, cartCount, MAX_LINES, parseCartCookie, serialiseCart, setQuantity, type Cart } from './cart';

const K1 = '00000000-0000-4000-8000-000000000001';
const K2 = '00000000-0000-4000-8000-000000000002';
const dish = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function ok(result: ReturnType<typeof addLine>): Cart {
  if (!result.ok) throw new Error(`expected ok, got ${result.code}`);
  return result.cart;
}

describe('addLine (FR-001, FR-002)', () => {
  it('starts a cart for the kitchen at quantity 1, then increments', () => {
    const one = ok(addLine(null, K1, dish(1)));
    expect(one).toEqual({ v: 1, kitchenId: K1, lines: [{ dishId: dish(1), qty: 1 }] });
    expect(ok(addLine(one, K1, dish(1))).lines).toEqual([{ dishId: dish(1), qty: 2 }]);
    expect(ok(addLine(one, K1, dish(2))).lines).toHaveLength(2);
  });

  it('refuses a dish from another kitchen unless replacing', () => {
    const cart = ok(addLine(null, K1, dish(1)));
    expect(addLine(cart, K2, dish(9))).toEqual({ ok: false, code: 'other_kitchen', kitchenId: K1 });
    expect(ok(addLine(cart, K2, dish(9), { replace: true }))).toEqual({
      v: 1,
      kitchenId: K2,
      lines: [{ dishId: dish(9), qty: 1 }],
    });
  });

  it('stops at 20 of one dish and 30 different dishes', () => {
    let cart: Cart | null = null;
    for (let i = 0; i < 20; i += 1) cart = ok(addLine(cart, K1, dish(1)));
    expect(addLine(cart, K1, dish(1))).toMatchObject({ ok: false, code: 'quantity_limit' });
    let wide: Cart | null = null;
    for (let i = 1; i <= MAX_LINES; i += 1) wide = ok(addLine(wide, K1, dish(i)));
    expect(addLine(wide, K1, dish(99))).toMatchObject({ ok: false, code: 'cart_full' });
  });
});

describe('setQuantity', () => {
  const cart = ok(addLine(ok(addLine(null, K1, dish(1))), K1, dish(2)));

  it('sets a quantity, removes the line at 0, and empties the cart when the last line goes', () => {
    expect(setQuantity(cart, dish(1), 5)).toMatchObject({ ok: true, cart: { lines: [{ dishId: dish(1), qty: 5 }, { dishId: dish(2), qty: 1 }] } });
    const removed = setQuantity(cart, dish(1), 0);
    expect(removed).toMatchObject({ ok: true, cart: { lines: [{ dishId: dish(2), qty: 1 }] } });
    if (!removed.ok) throw new Error();
    expect(setQuantity(removed.cart!, dish(2), 0)).toEqual({ ok: true, cart: null });
  });

  it('refuses quantities above 20 or below 0', () => {
    expect(setQuantity(cart, dish(1), 21)).toMatchObject({ ok: false, code: 'quantity_limit' });
    expect(setQuantity(cart, dish(1), -1)).toMatchObject({ ok: false, code: 'quantity_limit' });
  });

  it('ignores a dish that is not in the cart', () => {
    expect(setQuantity(cart, dish(7), 3)).toEqual({ ok: true, cart });
  });
});

describe('cart cookie (research R1)', () => {
  it('round-trips and counts items', () => {
    const cart = ok(addLine(ok(addLine(null, K1, dish(1))), K1, dish(1)));
    expect(parseCartCookie(serialiseCart(cart))).toEqual(cart);
    expect(cartCount(cart)).toBe(2);
    expect(cartCount(null)).toBe(0);
  });

  it('fails closed: anything that is not a valid cart is an empty cart', () => {
    for (const raw of [
      undefined,
      '',
      'not json',
      '{}',
      JSON.stringify({ v: 2, kitchenId: K1, lines: [] }),
      JSON.stringify({ v: 1, kitchenId: 'x', lines: [{ dishId: dish(1), qty: 1 }] }),
      JSON.stringify({ v: 1, kitchenId: K1, lines: [{ dishId: dish(1), qty: 21 }] }),
      JSON.stringify({ v: 1, kitchenId: K1, lines: [{ dishId: dish(1), qty: 1 }, { dishId: dish(1), qty: 2 }] }),
      JSON.stringify({ v: 1, kitchenId: K1, lines: [] }),
      JSON.stringify({ v: 1, kitchenId: K1, lines: Array.from({ length: 31 }, (_, i) => ({ dishId: dish(i + 1), qty: 1 })) }),
    ]) {
      expect(parseCartCookie(raw), String(raw)).toBeNull();
    }
  });

  it('stays under the 4 KB cookie limit at its largest', () => {
    const lines = Array.from({ length: MAX_LINES }, (_, i) => ({ dishId: dish(i + 1), qty: 20 }));
    expect(serialiseCart({ v: 1, kitchenId: K1, lines }).length).toBeLessThan(4096);
  });
});
