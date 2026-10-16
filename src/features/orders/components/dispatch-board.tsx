import { Bike, CircleAlert, Clock, Flag, Hourglass, MapPin, Store, UserCheck, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { isLocale } from '@/shared/i18n/config';
import { formatPrice } from '@/shared/i18n/format';
import { LocalizedText } from '@/shared/ui/localized-text';
import type { BoardOrder, DispatchBoard as Board } from '../admin-queries';
import { DISPATCH_GROUPS, type DispatchGroup } from '../domain/dispatch-group';
import { AssignAgentForm } from './assign-agent-form';
import { OrderNumber } from './order-number';
import { PaymentLabel } from './payment-label';
import { StatusBadge } from './status-badge';

/** Group icons: the group's colour lives only here, beside its word (owner edit 2). */
const groupLook: Record<DispatchGroup, { icon: typeof Clock; className: string }> = {
  waiting_kitchen: { icon: Hourglass, className: 'text-status-placed' },
  needs_agent: { icon: CircleAlert, className: 'text-status-preparing' },
  assigned: { icon: UserCheck, className: 'text-status-accepted' },
  out_for_delivery: { icon: Bike, className: 'text-status-picked' },
  finished: { icon: Flag, className: 'text-status-delivered' },
};

/**
 * The dispatch board (FR-033, 003 FR-020/FR-021): five groups side by side at 1280 px and wider,
 * each card with what dispatch needs at a glance, and assign or reassign on the card.
 */
export function DispatchBoard({ board, now }: { board: Board; now: Date }) {
  const t = useTranslations();
  const current = useLocale();
  const locale = isLocale(current) ? current : 'en';
  const minutes = (at: Date) => Math.max(0, Math.round((now.getTime() - at.getTime()) / 60_000));
  const card = (order: BoardOrder) => {
    const assignable = order.status === 'accepted' || order.status === 'preparing' || order.status === 'ready';
    return (
      <li key={order.id} data-testid="board-order" data-order-no={order.orderNo} className="flex flex-col gap-1.5 rounded-md bg-surface p-3 shadow-1">
        <span className="flex items-center justify-between gap-2">
          <Link href={`/admin/orders/${order.id}`} className="tap inline-flex items-center text-heading text-ink underline-offset-4 hover:underline">
            <OrderNumber orderNo={order.orderNo} className="font-bold" />
          </Link>
          <span className="inline-flex items-center gap-1 text-small text-muted">
            <Clock aria-hidden="true" className="size-4" />
            {t('dispatch.minutesAgo', { minutes: minutes(order.statusChangedAt) })}
          </span>
        </span>
        <span>
          <StatusBadge status={order.status} />
        </span>
        <span className="flex items-start gap-1.5 text-small font-semibold">
          <Store aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" />
          <LocalizedText pair={order.kitchen} />
        </span>
        <span className="flex items-start gap-1.5 text-small text-muted">
          <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {order.landmark}
        </span>
        <span className="flex flex-wrap items-center justify-between gap-x-2 text-small">
          <span className="text-base font-bold">{formatPrice(order.grandTotal, locale)}</span>
          <PaymentLabel method={order.paymentMethod} />
        </span>
        {order.agentName ? (
          <span className="flex items-center gap-1.5 border-t border-line pt-1.5 text-small font-semibold">
            <UserRound aria-hidden="true" className="size-4 shrink-0 text-sea" />
            {t('dispatch.agent', { name: order.agentName })}
          </span>
        ) : assignable ? (
          <span className="flex items-center gap-1.5 border-t border-line pt-1.5 text-small font-bold text-status-preparing">
            <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
            {t('dispatchGroup.needs_agent')}
          </span>
        ) : null}
        {assignable ? <AssignAgentForm orderId={order.id} currentAgentId={order.agentId} agents={board.agents} /> : null}
      </li>
    );
  };
  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid min-w-[1060px] grid-cols-5 gap-3 xl:min-w-0">
        {DISPATCH_GROUPS.map((group) => {
          const { icon: Icon, className } = groupLook[group];
          return (
            <section
              key={group}
              aria-labelledby={`group-${group}`}
              data-testid={`group-${group}`}
              className="flex min-w-0 flex-col gap-2 rounded-lg bg-surface-sunk p-2"
            >
              <h2 id={`group-${group}`} className="flex items-center gap-2 px-1 py-1.5 text-base font-bold">
                <span className="grid size-7 shrink-0 place-items-center rounded-sm bg-surface shadow-1">
                  <Icon aria-hidden="true" className={`size-4 ${className}`} strokeWidth={2.3} />
                </span>
                <span className="min-w-0 flex-1">{t(`dispatchGroup.${group}`)}</span>
                <span className="rounded-full bg-ink px-2 text-small font-bold text-surface">{board.groups[group].length}</span>
              </h2>
              {board.groups[group].length === 0 ? (
                <p className="px-1 text-small text-muted">{t('dispatch.none')}</p>
              ) : (
                <ul className="flex flex-col gap-2">{board.groups[group].map(card)}</ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
