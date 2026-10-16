import type { OrderStatus } from '@/features/orders/domain/lifecycle';

export type CustomerTab = 'home' | 'orders' | 'cart' | 'account';

export type TabBarInput = {
  current: CustomerTab;
  cart: { count: number; itemTotal: number } | null;
  ongoing: { id: string; orderNo: number; status: OrderStatus } | null;
  /** The order page passes its own order, which the bar then does not advertise. */
  excludeOrderId?: string;
  onCartPage?: boolean;
};

export type TabBarState = {
  visible: boolean;
  active: CustomerTab;
  orders: { href: '/orders'; state: { status: OrderStatus; orderNo: number } | null };
  cart: { count: number; itemTotal: number } | null;
};

/**
 * The customer tab bar (research R5, data-model.md "TabBarState"). The Orders tab always opens the
 * orders list (owner plan review); the cart page with items swaps the tabs for the place-order bar.
 */
export function tabBarState(input: TabBarInput): TabBarState {
  const cart = input.cart && input.cart.count > 0 ? { count: input.cart.count, itemTotal: input.cart.itemTotal } : null;
  const ongoing = input.ongoing && input.ongoing.id !== input.excludeOrderId ? input.ongoing : null;
  return {
    visible: !(input.onCartPage && cart),
    active: input.current,
    orders: { href: '/orders', state: ongoing ? { status: ongoing.status, orderNo: ongoing.orderNo } : null },
    cart,
  };
}
