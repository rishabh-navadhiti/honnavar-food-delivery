import { describe, expect, it } from 'vitest';
import { tabBarState, type TabBarInput } from './tab-bar-state';

const base: TabBarInput = { current: 'home', cart: null, ongoing: null };
const ongoing = { id: 'o-1', orderNo: 1042, status: 'preparing' as const };

describe('tabBarState (data-model.md "TabBarState")', () => {
  it('is visible everywhere except the cart page while the cart has items', () => {
    expect(tabBarState(base).visible).toBe(true);
    expect(tabBarState({ ...base, current: 'cart', onCartPage: true, cart: null }).visible).toBe(true);
    expect(tabBarState({ ...base, current: 'cart', onCartPage: true, cart: { count: 0, itemTotal: 0 } }).visible).toBe(true);
    expect(tabBarState({ ...base, current: 'cart', onCartPage: true, cart: { count: 2, itemTotal: 480 } }).visible).toBe(false);
    expect(tabBarState({ ...base, cart: { count: 2, itemTotal: 480 } }).visible).toBe(true);
  });

  it('always sends the Orders tab to the orders list', () => {
    expect(tabBarState(base).orders.href).toBe('/orders');
    expect(tabBarState({ ...base, ongoing }).orders.href).toBe('/orders');
    expect(tabBarState({ ...base, ongoing, excludeOrderId: 'o-1' }).orders.href).toBe('/orders');
  });

  it("shows the ongoing order's status, except on that order's own page", () => {
    expect(tabBarState(base).orders.state).toBeNull();
    expect(tabBarState({ ...base, ongoing }).orders.state).toEqual({ status: 'preparing', orderNo: 1042 });
    expect(tabBarState({ ...base, ongoing, excludeOrderId: 'o-1' }).orders.state).toBeNull();
    expect(tabBarState({ ...base, ongoing, excludeOrderId: 'o-2' }).orders.state).toEqual({ status: 'preparing', orderNo: 1042 });
  });

  it('shows the cart count and item total only when the cart has items', () => {
    expect(tabBarState(base).cart).toBeNull();
    expect(tabBarState({ ...base, cart: { count: 0, itemTotal: 0 } }).cart).toBeNull();
    expect(tabBarState({ ...base, cart: { count: 3, itemTotal: 620 } }).cart).toEqual({ count: 3, itemTotal: 620 });
  });

  it('marks the current tab active', () => {
    for (const current of ['home', 'orders', 'cart', 'account'] as const) {
      expect(tabBarState({ ...base, current }).active).toBe(current);
    }
  });
});
