import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { requireSession } from '@/features/auth/session';
import { OrderNumber } from '@/features/orders/components/order-number';
import { StatusBadge } from '@/features/orders/components/status-badge';
import { listCustomerOrders, type CustomerOrderSummary } from '@/features/orders/queries';
import { isLocale } from '@/shared/i18n/config';
import { formatDayTime, formatPrice } from '@/shared/i18n/format';
import { ButtonLink } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { LocalizedText } from '@/shared/ui/localized-text';

export default async function OrdersPage() {
  const session = await requireSession('customer');
  const t = await getTranslations();
  const current = await getLocale();
  const locale = isLocale(current) ? current : 'en';
  const orders = await listCustomerOrders(session.subjectId, new Date());
  const ongoing = orders.filter((o) => !o.finished);
  const past = orders.filter((o) => o.finished);

  const card = (order: CustomerOrderSummary) => (
    <li key={order.id}>
      <Link
        href={`/orders/${order.id}`}
        className="flex min-h-touch flex-col gap-1 rounded-2xl border border-line bg-surface p-4"
        data-testid="order-card"
      >
        <span className="flex items-center justify-between gap-2">
          <OrderNumber orderNo={order.orderNo} />
          <StatusBadge status={order.status} />
        </span>
        <span className="text-base font-semibold">
          <LocalizedText pair={order.kitchen.name} />
        </span>
        <span className="text-sm text-muted">
          {formatDayTime(order.placedAt, locale)}
          <span aria-hidden="true"> · </span>
          {formatPrice(order.grandTotal, locale)}
        </span>
      </Link>
    </li>
  );

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">{t('orders.title')}</h1>
      {orders.length === 0 ? (
        <EmptyState title={t('orders.empty')} action={<ButtonLink href="/">{t('cart.browse')}</ButtonLink>} />
      ) : (
        <>
          <section aria-labelledby="ongoing-title" className="flex flex-col gap-3">
            <h2 id="ongoing-title" className="text-lg font-bold">
              {t('orders.ongoing')}
            </h2>
            {ongoing.length === 0 ? <p className="text-base text-muted">{t('orders.noOngoing')}</p> : <ul className="flex flex-col gap-3">{ongoing.map(card)}</ul>}
          </section>
          {past.length > 0 ? (
            <section aria-labelledby="past-title" className="flex flex-col gap-3">
              <h2 id="past-title" className="text-lg font-bold">
                {t('orders.past')}
              </h2>
              <ul className="flex flex-col gap-3">{past.map(card)}</ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
