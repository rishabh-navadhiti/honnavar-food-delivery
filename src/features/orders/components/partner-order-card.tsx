import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { env } from '@/shared/env';
import { isLocale } from '@/shared/i18n/config';
import { formatPrice, formatTime } from '@/shared/i18n/format';
import { LocalizedText } from '@/shared/ui/localized-text';
import { acceptDeadline } from '../domain/expiry';
import type { PartnerOrderView } from '../partner-queries';
import { OrderNumber } from './order-number';
import { PartnerActions } from './partner-actions';
import { PaymentLabel } from './payment-label';
import { ReasonText } from './reason-text';
import { StatusBadge } from './status-badge';
import { TimeLeft } from './time-left';

/**
 * One order for the kitchen (FR-028): number, times, status with its time, dishes, item total,
 * payment, display name, landmark and rider note; Placed orders highlighted with time left.
 */
export function PartnerOrderCard({ order, link = true }: { order: PartnerOrderView; link?: boolean }) {
  const t = useTranslations();
  const current = useLocale();
  const locale = isLocale(current) ? current : 'en';
  const highlighted = order.status === 'placed';
  return (
    <article
      data-testid="partner-order"
      data-order-no={order.orderNo}
      className={`flex flex-col gap-3 rounded-2xl border p-4 ${highlighted ? 'border-2 border-warn bg-amber-50' : 'border-line bg-surface'}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        {link ? (
          <Link href={`/partner/orders/${order.id}`} className="min-h-touch py-2 text-lg">
            <OrderNumber orderNo={order.orderNo} />
          </Link>
        ) : (
          <OrderNumber orderNo={order.orderNo} className="text-lg" />
        )}
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} />
          <span className="text-sm text-muted">{formatTime(order.statusChangedAt, locale)}</span>
        </span>
      </header>
      <p className="text-sm text-muted">{t('partnerOrders.placedAt', { time: formatTime(order.placedAt, locale) })}</p>
      {order.status === 'placed' ? <TimeLeft deadline={acceptDeadline(order.placedAt, env.ACCEPT_WINDOW_MINUTES).toISOString()} /> : null}
      <ul className="flex flex-col gap-1">
        {order.items.map((item, index) => (
          <li key={index} className="flex justify-between gap-3 text-base">
            <LocalizedText pair={item.name} />
            <span className="font-bold">{t('partnerOrders.quantity', { quantity: item.quantity })}</span>
          </li>
        ))}
      </ul>
      <p className="flex justify-between text-base">
        <span>{t('cart.itemTotal')}</span>
        <span className="font-bold">{formatPrice(order.itemTotal, locale)}</span>
      </p>
      <p className="text-sm">
        <PaymentLabel method={order.paymentMethod} />
      </p>
      <div className="flex flex-col gap-0.5 text-sm">
        <p>{order.customerName ?? t('partnerOrders.customer')}</p>
        <p className="text-muted">{order.landmark}</p>
        {order.riderNote ? <p className="text-muted">{order.riderNote}</p> : null}
      </div>
      {order.status === 'cancelled' && order.cancelledBy ? (
        <p className="text-base font-semibold text-danger">{t(`partnerOrders.cancelledBy.${order.cancelledBy === 'customer' ? 'customer' : 'admin'}`)}</p>
      ) : null}
      {order.reason ? <ReasonText reason={order.reason} note={order.reasonNote} className="text-sm" /> : null}
      {order.finished ? null : <PartnerActions orderId={order.id} status={order.status} />}
    </article>
  );
}
