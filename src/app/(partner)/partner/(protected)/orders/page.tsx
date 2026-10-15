import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireSession } from '@/features/auth/session';
import { PartnerOrderCard } from '@/features/orders/components/partner-order-card';
import { listPartnerOrders } from '@/features/orders/partner-queries';
import { LiveRefresh } from '@/shared/polling/live-refresh';
import { UpdatedAt } from '@/shared/polling/updated-at';
import { EmptyState } from '@/shared/ui/empty-state';

/** The kitchen's open orders, updating on their own (FR-022, FR-028). */
export default async function PartnerOrdersPage() {
  const session = await requireSession('partner');
  const t = await getTranslations('partnerOrders');
  const now = new Date();
  const orders = await listPartnerOrders(session.kitchenId!, now);
  return (
    <div className="flex flex-col gap-4">
      <LiveRefresh />
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <UpdatedAt at={now} />
      </div>
      <Link href="/partner/day" className="min-h-touch self-start py-2 text-base font-semibold text-primary">
        {t('dayLink')}
      </Link>
      {orders.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <PartnerOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
