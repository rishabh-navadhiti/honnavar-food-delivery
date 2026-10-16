import type { OrderStatus } from '@/features/orders/domain/lifecycle';

export type CustomerTab = 'home' | 'orders' | 'account';
export type CustomerPage = CustomerTab | 'cart' | 'kitchen';

type CartSummary = { count: number; itemTotal: number };

export type TabBarInput = {
  current: CustomerPage;
  cart: CartSummary | null;
  ongoing: { id: string; orderNo: number; status: OrderStatus } | null;
  /** The order page passes its own order, which the bar then does not advertise. */
  excludeOrderId?: string;
  onCartPage?: boolean;
};

export type TabBarState = {
  visible: boolean;
  active: CustomerPage;
  orders: { href: '/orders'; state: { status: OrderStatus; orderNo: number } | null };
  /** The floating cart button on tab pages while the cart has items. */
  cartButton: CartSummary | null;
  /** The full-width "View cart" bar on the kitchen page while the cart has items. */
  kitchenBar: CartSummary | null;
};

/**
 * The customer's bottom navigation (research R5, amended by the owner's review): three tabs, a
 * floating cart button on tab pages, a "View cart" bar on the kitchen page (which has no tabs), and
 * the place-order bar instead of the tabs on the cart page with items. Orders always opens the list.
 */
export function tabBarState(input: TabBarInput): TabBarState {
  const cart = input.cart && input.cart.count > 0 ? { count: input.cart.count, itemTotal: input.cart.itemTotal } : null;
  const ongoing = input.ongoing && input.ongoing.id !== input.excludeOrderId ? input.ongoing : null;
  const kitchen = input.current === 'kitchen';
  const cartPage = Boolean(input.onCartPage) || input.current === 'cart';
  return {
    visible: !kitchen && !(input.onCartPage && cart),
    active: input.current,
    orders: { href: '/orders', state: ongoing ? { status: ongoing.status, orderNo: ongoing.orderNo } : null },
    cartButton: cart && !kitchen && !cartPage ? cart : null,
    kitchenBar: cart && kitchen ? cart : null,
  };
}
