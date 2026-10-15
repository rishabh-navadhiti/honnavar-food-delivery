import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { requireSession } from '@/features/auth/session';
import { OrderNumber } from '@/features/orders/components/order-number';
import { StatusBadge } from '@/features/orders/components/status-badge';
import { getPartnerDay } from '@/features/orders/partner-queries';
import { isLocale } from '@/shared/i18n/config';
import { formatPrice, formatTime } from '@/shared/i18n/format';
import { EmptyState } from '@/shared/ui/empty-state';

/** Today's orders and totals for the kitchen (FR-031). */
export default async function PartnerDayPage() {
  const session = await requireSession('partner');
  const t = await getTranslations('dayView');
  const current = await getLocale();
  const locale = isLocale(current) ? current : 'en';
  const { orders, totals } = await getPartnerDay(session.kitchenId!, new Date());
  const stat = (label: string, value: string | number, testId: string) => (
    <div className="flex flex-col rounded-xl border border-line bg-surface p-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-2xl font-bold" data-testid={testId}>
        {value}
      </dd>
    </div>
  );
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <dl className="grid grid-cols-2 gap-2">
        {stat(t('received'), totals.received, 'day-received')}
        {stat(t('accepted'), totals.accepted, 'day-accepted')}
        {stat(t('rejectedOrCancelled'), totals.rejectedOrCancelled, 'day-rejected')}
        {stat(t('delivered'), totals.delivered, 'day-delivered')}
        <div className="col-span-2">{stat(t('deliveredValue'), formatPrice(totals.deliveredValue, locale), 'day-value')}</div>
      </dl>
      {orders.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/partner/orders/${order.id}`} className="flex min-h-touch items-center justify-between gap-2 px-4 py-3">
                <span className="flex flex-col">
                  <OrderNumber orderNo={order.orderNo} />
                  <span className="text-sm text-muted">{formatTime(order.placedAt, locale)}</span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <StatusBadge status={order.status} />
                  <span className="text-sm font-semibold">{formatPrice(order.itemTotal, locale)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
