import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LocalizedText } from '@/shared/ui/localized-text';
import type { OngoingOrder } from '../queries';
import { OrderNumber } from './order-number';
import { StatusBadge } from './status-badge';

/** A slim link to the customer's current order (FR-024). Server-rendered; no polling of its own. */
export function OngoingOrderStrip({ order }: { order: OngoingOrder }) {
  const t = useTranslations('ongoing');
  return (
    <Link
      href={`/orders/${order.id}`}
      data-testid="ongoing-strip"
      className="flex min-h-touch items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-sm shadow-md"
    >
      <span className="sr-only">{t('label')}</span>
      <OrderNumber orderNo={order.orderNo} />
      <span className="min-w-0 flex-1 truncate">
        <LocalizedText pair={order.kitchenName} />
      </span>
      <StatusBadge status={order.status} />
      <span aria-hidden="true">→</span>
    </Link>
  );
}
