import { describe, expect, it } from 'vitest';
import { tabBarState, type TabBarInput } from './tab-bar-state';

const base: TabBarInput = { current: 'home', cart: null, ongoing: null };
const ongoing = { id: 'o-1', orderNo: 1042, status: 'preparing' as const };
const items = { count: 2, itemTotal: 480 };

describe('tabBarState (data-model.md "TabBarState", owner review: three tabs and a floating cart)', () => {
  it('shows the tabs on tab pages, hides them on the kitchen page and on the cart page with items', () => {
    expect(tabBarState(base).visible).toBe(true);
    expect(tabBarState({ ...base, current: 'kitchen' }).visible).toBe(false);
    expect(tabBarState({ ...base, current: 'kitchen', cart: items }).visible).toBe(false);
    expect(tabBarState({ ...base, current: 'cart', onCartPage: true, cart: null }).visible).toBe(true);
    expect(tabBarState({ ...base, current: 'cart', onCartPage: true, cart: { count: 0, itemTotal: 0 } }).visible).toBe(true);
    expect(tabBarState({ ...base, current: 'cart', onCartPage: true, cart: items }).visible).toBe(false);
  });

  it('shows the floating cart button on tab pages while the cart has items', () => {
    for (const current of ['home', 'orders', 'account'] as const) {
      expect(tabBarState({ ...base, current, cart: items }).cartButton).toEqual(items);
      expect(tabBarState({ ...base, current }).cartButton).toBeNull();
      expect(tabBarState({ ...base, current, cart: { count: 0, itemTotal: 0 } }).cartButton).toBeNull();
    }
    expect(tabBarState({ ...base, current: 'kitchen', cart: items }).cartButton).toBeNull();
    expect(tabBarState({ ...base, current: 'cart', onCartPage: true, cart: items }).cartButton).toBeNull();
  });

  it('shows the kitchen cart bar only on the kitchen page while the cart has items', () => {
    expect(tabBarState({ ...base, current: 'kitchen', cart: items }).kitchenBar).toEqual(items);
    expect(tabBarState({ ...base, current: 'kitchen' }).kitchenBar).toBeNull();
    expect(tabBarState({ ...base, cart: items }).kitchenBar).toBeNull();
  });

  it('always sends the Orders tab to the orders list', () => {
    expect(tabBarState(base).orders.href).toBe('/orders');
    expect(tabBarState({ ...base, ongoing }).orders.href).toBe('/orders');
  });

  it("shows the ongoing order's status, except on that order's own page", () => {
    expect(tabBarState(base).orders.state).toBeNull();
    expect(tabBarState({ ...base, ongoing }).orders.state).toEqual({ status: 'preparing', orderNo: 1042 });
    expect(tabBarState({ ...base, ongoing, excludeOrderId: 'o-1' }).orders.state).toBeNull();
    expect(tabBarState({ ...base, ongoing, excludeOrderId: 'o-2' }).orders.state).toEqual({ status: 'preparing', orderNo: 1042 });
  });

  it('marks the current tab active', () => {
    for (const current of ['home', 'orders', 'account'] as const) {
      expect(tabBarState({ ...base, current }).active).toBe(current);
    }
  });
});
