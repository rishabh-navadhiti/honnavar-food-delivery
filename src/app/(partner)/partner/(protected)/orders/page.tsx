import { CalendarDays, MessageSquareText } from 'lucide-react';
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
    <div className="flex flex-col gap-2">
      <LiveRefresh />
      <div className="flex items-center gap-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="text-title font-bold leading-[var(--lh-tight)]">{t('title')}</h1>
          <UpdatedAt at={now} />
        </div>
        <Link href="/partner/day" aria-label={t('dayLink')} className="grid size-12 shrink-0 place-items-center text-primary-strong">
          <CalendarDays aria-hidden="true" className="size-5" />
        </Link>
        <Link
          href="/partner/messages"
          aria-label={t('messagesLink')}
          className="grid size-12 shrink-0 place-items-center text-primary-strong"
        >
          <MessageSquareText aria-hidden="true" className="size-5" />
        </Link>
      </div>
      {orders.length === 0 ? (
        <EmptyState illustration="NoOrders" title={t('empty')} />
      ) : (
        <div className="flex flex-col gap-2 md:grid md:grid-cols-2">
          {orders.map((order) => (
            <PartnerOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
