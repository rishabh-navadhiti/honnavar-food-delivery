import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { isLocale } from '@/shared/i18n/config';
import { formatPrice } from '@/shared/i18n/format';
import { LocalizedText } from '@/shared/ui/localized-text';
import type { BoardOrder, DispatchBoard as Board } from '../admin-queries';
import { DISPATCH_GROUPS } from '../domain/dispatch-group';
import { AssignAgentForm } from './assign-agent-form';
import { OrderNumber } from './order-number';
import { PaymentLabel } from './payment-label';
import { StatusBadge } from './status-badge';

/** The dispatch board (FR-033): five groups, assign controls where an agent is needed or can change. */
export function DispatchBoard({ board, now }: { board: Board; now: Date }) {
  const t = useTranslations();
  const current = useLocale();
  const locale = isLocale(current) ? current : 'en';
  const card = (order: BoardOrder) => (
    <li key={order.id} data-testid="board-order" data-order-no={order.orderNo} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
      <span className="flex items-center justify-between gap-2">
        <Link href={`/admin/orders/${order.id}`} className="text-base font-semibold text-primary underline-offset-4 hover:underline">
          <OrderNumber orderNo={order.orderNo} />
        </Link>
        <StatusBadge status={order.status} />
      </span>
      <span className="text-sm font-semibold">
        <LocalizedText pair={order.kitchen} />
      </span>
      <span className="text-sm text-muted">{order.landmark}</span>
      <span className="flex justify-between text-sm">
        <span>{formatPrice(order.grandTotal, locale)}</span>
        <PaymentLabel method={order.paymentMethod} />
      </span>
      <span className="text-sm text-muted">{t('dispatch.minutesAgo', { minutes: Math.max(0, Math.round((now.getTime() - order.placedAt.getTime()) / 60_000)) })}</span>
      {order.agentName ? <span className="text-sm font-semibold">{t('dispatch.agent', { name: order.agentName })}</span> : null}
      {order.status === 'accepted' || order.status === 'preparing' || order.status === 'ready' ? (
        <AssignAgentForm orderId={order.id} currentAgentId={order.agentId} agents={board.agents} />
      ) : null}
    </li>
  );
  return (
    <div className="grid gap-3 lg:grid-cols-5">
      {DISPATCH_GROUPS.map((group) => (
        <section key={group} aria-labelledby={`group-${group}`} data-testid={`group-${group}`} className="flex flex-col gap-2 rounded-2xl bg-secondary p-2">
          <h2 id={`group-${group}`} className="px-1 text-base font-bold">
            {t(`dispatchGroup.${group}`)} <span className="text-muted">({board.groups[group].length})</span>
          </h2>
          {board.groups[group].length === 0 ? (
            <p className="px-1 text-sm text-muted">{t('dispatch.none')}</p>
          ) : (
            <ul className="flex flex-col gap-2">{board.groups[group].map(card)}</ul>
          )}
        </section>
      ))}
    </div>
  );
}
