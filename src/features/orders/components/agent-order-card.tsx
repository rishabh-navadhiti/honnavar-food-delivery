import { Banknote, Clock, MapPin, Smartphone, Store } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { isLocale } from '@/shared/i18n/config';
import { formatPrice, formatTime } from '@/shared/i18n/format';
import { LocalizedText } from '@/shared/ui/localized-text';
import type { AgentOrderCard as Card } from '../agent-queries';
import { OrderNumber } from './order-number';
import { StatusBadge } from './status-badge';

/**
 * One assigned order in the agent's list (FR-039), in the partner card language (003, FR-022):
 * number, status and time; where from; where to; cash to collect. The whole card opens the order.
 */
export function AgentOrderCard({ order }: { order: Card }) {
  const t = useTranslations('agentHome');
  const current = useLocale();
  const locale = isLocale(current) ? current : 'en';
  return (
    <Link
      href={`/agent/orders/${order.id}`}
      data-testid="agent-order"
      data-order-no={order.orderNo}
      className="flex flex-col gap-2 rounded-lg bg-surface p-3 shadow-1 transition-shadow duration-(--duration-fast) hover:shadow-2"
    >
      <span className="flex items-center gap-2">
        <OrderNumber orderNo={order.orderNo} className="text-heading font-bold" />
        <StatusBadge status={order.status} />
        <span className="ms-auto inline-flex items-center gap-1 text-small text-muted">
          <Clock aria-hidden="true" className="size-4" />
          {formatTime(order.statusChangedAt, locale)}
        </span>
      </span>
      <span className="flex items-start gap-2 text-base">
        <Store aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
        <span className="flex flex-col">
          <span>
            <span className="font-semibold">{t('from')}</span> <LocalizedText pair={order.kitchen.name} />
          </span>
          <span className="text-small text-muted">{order.kitchen.landmark}</span>
        </span>
      </span>
      <span className="flex items-start gap-2 text-base">
        <MapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-sea" />
        <span>
          <span className="font-semibold">{t('to')}</span> {order.deliveryLandmark}
        </span>
      </span>
      {order.paymentMethod === 'cod' ? (
        <span className="inline-flex items-center gap-2 rounded-md bg-warn-soft px-2.5 py-1.5 text-base font-bold text-warn">
          <Banknote aria-hidden="true" className="size-5 shrink-0" />
          {t('collect', { amount: formatPrice(order.grandTotal, locale) })}
        </span>
      ) : (
        <span className="inline-flex items-center gap-2 text-small text-muted">
          <Smartphone aria-hidden="true" className="size-4 shrink-0" />
          {t('paidUpi')}
        </span>
      )}
    </Link>
  );
}
