import { getOptionalSession } from '@/features/auth/session';
import { getCartView, getOngoingOrder } from '@/features/orders/queries';
import { readCart } from '../cookie';
import { tabBarState, type CustomerTab } from '../tab-bar-state';
import { TabBarView } from './tab-bar-view';

/**
 * The bottom of every customer screen (FR-013, research R5). Rendered per page, like the 002 dock,
 * so the cart total and the ongoing order's status are fresh on every navigation and refresh.
 */
export async function CustomerTabBar({
  current,
  excludeOrderId,
  onCartPage = false,
}: {
  current: CustomerTab;
  excludeOrderId?: string;
  onCartPage?: boolean;
}) {
  const now = new Date();
  const session = await getOptionalSession('customer');
  const [view, ongoing] = await Promise.all([getCartView(await readCart(), null, now), session ? getOngoingOrder(session.subjectId, now) : null]);
  const state = tabBarState({
    current,
    cart: view ? { count: view.lines.reduce((n, l) => n + l.qty, 0), itemTotal: view.bill.itemTotal } : null,
    ongoing,
    excludeOrderId,
    onCartPage,
  });
  if (!state.visible) return null;
  return <TabBarView state={state} signedIn={Boolean(session)} live />;
}
