import { getOptionalSession } from '@/features/auth/session';
import { OngoingOrderStrip } from '@/features/orders/components/ongoing-order-strip';
import { getOngoingOrder } from '@/features/orders/queries';
import { CurrentCartBar } from './cart-bar';

/**
 * The bottom of customer screens: the ongoing-order strip (FR-024) above the cart bar. The cart bar
 * shows only where people browse (home and kitchen pages); an order page leaves out its own order.
 */
export async function CustomerDock({ showCart = false, excludeOrderId }: { showCart?: boolean; excludeOrderId?: string }) {
  const session = await getOptionalSession('customer');
  const ongoing = session ? await getOngoingOrder(session.subjectId, new Date()) : null;
  const strip = ongoing && ongoing.id !== excludeOrderId ? ongoing : null;
  const cartBar = showCart ? await CurrentCartBar() : null;
  if (!strip && !cartBar) return null;
  return (
    <div className="sticky bottom-3 z-10 flex flex-col gap-2" data-testid="customer-dock">
      {strip ? <OngoingOrderStrip order={strip} /> : null}
      {cartBar}
    </div>
  );
}
