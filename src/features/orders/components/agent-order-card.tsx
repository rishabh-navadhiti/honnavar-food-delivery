import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { isLocale } from '@/shared/i18n/config';
import { formatPrice, formatTime } from '@/shared/i18n/format';
import { LocalizedText } from '@/shared/ui/localized-text';
import type { AgentOrderCard as Card } from '../agent-queries';
import { OrderNumber } from './order-number';
import { StatusBadge } from './status-badge';

/** One assigned order in the agent's list (FR-039): where from, where to, and cash to collect. */
export function AgentOrderCard({ order }: { order: Card }) {
  const t = useTranslations('agentHome');
  const current = useLocale();
  const locale = isLocale(current) ? current : 'en';
  return (
    <Link
      href={`/agent/orders/${order.id}`}
      data-testid="agent-order"
      data-order-no={order.orderNo}
      className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4"
    >
      <span className="flex flex-wrap items-center justify-between gap-2">
        <OrderNumber orderNo={order.orderNo} className="text-lg" />
        <span className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          <span className="text-sm text-muted">{formatTime(order.statusChangedAt, locale)}</span>
        </span>
      </span>
      <span className="text-base">
        <span className="font-semibold">{t('from')}</span> <LocalizedText pair={order.kitchen.name} />
        <span className="block text-sm text-muted">{order.kitchen.landmark}</span>
      </span>
      <span className="text-base">
        <span className="font-semibold">{t('to')}</span> {order.deliveryLandmark}
      </span>
      {order.paymentMethod === 'cod' ? (
        <span className="text-base font-bold text-warn">{t('collect', { amount: formatPrice(order.grandTotal, locale) })}</span>
      ) : (
        <span className="text-sm text-muted">{t('paidUpi')}</span>
      )}
    </Link>
  );
}
