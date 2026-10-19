import { Clock, MapPin, MessageSquareText, Package, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { env } from '@/shared/env';
import { isLocale } from '@/shared/i18n/config';
import { formatPrice, formatTime } from '@/shared/i18n/format';
import { pickLocalized } from '@/shared/i18n/localized';
import { Card } from '@/shared/ui/card';
import { acceptDeadline } from '../domain/expiry';
import type { PartnerOrderView } from '../partner-queries';
import { OrderNumber } from './order-number';
import { PartnerActions } from './partner-actions';
import { PaymentLabel } from './payment-label';
import { ReasonText } from './reason-text';
import { StatusBadge } from './status-badge';
import { TimeLeft } from './time-left';

/**
 * One order for the kitchen (FR-028, 003 FR-018), read in one pass: number, status and time; item
 * count, item total and payment; dishes; the customer's name, landmark and rider note; the one next
 * action. A waiting order is outlined and counts down in words (no coloured rail or bar: owner edit 2;
 * three cards fit at 390×844, SC-007).
 */
export function PartnerOrderCard({ order, link = true }: { order: PartnerOrderView; link?: boolean }) {
  const t = useTranslations();
  const current = useLocale();
  const locale = isLocale(current) ? current : 'en';
  const placed = order.status === 'placed';
  const count = order.items.reduce((n, item) => n + item.quantity, 0);
  const dishes = order.items.map((item) => `${pickLocalized(item.name, locale)?.text ?? ''} × ${item.quantity}`).join(' · ');
  const details = (
    <>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-base">
        <span className="inline-flex items-center gap-1.5 text-muted">
          <Package aria-hidden="true" className="size-4" />
          {t('cart.itemCount', { count })}
        </span>
        <span className="font-bold">
          <span className="sr-only">{t('cart.itemTotal')} </span>
          {formatPrice(order.itemTotal, locale)}
        </span>
        <span className="text-small">
          <PaymentLabel method={order.paymentMethod} />
        </span>
      </p>
      <p className="text-small text-ink" data-testid="partner-order-dishes">
        {dishes}
      </p>
      <p className="flex min-w-0 items-center gap-1.5 text-small text-muted">
        <UserRound aria-hidden="true" className="size-4 shrink-0" />
        <span className="shrink-0 font-semibold text-ink">{order.customerName ?? t('partnerOrders.customer')}</span>
        <MapPin aria-hidden="true" className="ms-1 size-4 shrink-0" />
        <span className="min-w-0 truncate" data-truncate title={order.riderNote ? `${order.landmark} · ${order.riderNote}` : order.landmark}>
          {order.landmark}
          {order.riderNote ? (
            <>
              <MessageSquareText aria-hidden="true" className="mx-1 inline size-4 align-[-3px]" />
              {order.riderNote}
            </>
          ) : null}
        </span>
      </p>
    </>
  );
  return (
    <Card tone={placed ? 'attention' : 'default'} className="flex flex-col gap-1.5 p-3" data-testid="partner-order" data-order-no={order.orderNo}>
      <header className="flex items-center gap-2">
        <OrderNumber orderNo={order.orderNo} className="text-heading font-bold" />
        <StatusBadge status={order.status} />
        <span className="ms-auto inline-flex items-center gap-1 text-small text-muted">
          <Clock aria-hidden="true" className="size-4" />
          <span className="sr-only">{t('partnerOrders.placedAt', { time: formatTime(order.placedAt, locale) })}</span>
          <span aria-hidden="true">{formatTime(order.placedAt, locale)}</span>
        </span>
      </header>
      {placed ? (
        <TimeLeft deadline={acceptDeadline(order.placedAt, env.ACCEPT_WINDOW_MINUTES).toISOString()} />
      ) : null}
      {link ? (
        <Link href={`/partner/orders/${order.id}`} className="-mx-1 flex min-h-touch flex-col gap-0.5 rounded-md px-1 leading-[var(--lh-snug)] hover:bg-surface-sunk">
          {details}
        </Link>
      ) : (
        <div className="flex flex-col gap-0.5 leading-[var(--lh-snug)]">{details}</div>
      )}
      {order.status === 'cancelled' && order.cancelledBy ? (
        <p className="text-base font-semibold text-danger">{t(`partnerOrders.cancelledBy.${order.cancelledBy === 'customer' ? 'customer' : 'admin'}`)}</p>
      ) : null}
      {order.reason ? <ReasonText reason={order.reason} note={order.reasonNote} className="text-small" /> : null}
      {order.finished ? null : <PartnerActions orderId={order.id} status={order.status} />}
    </Card>
  );
}
