import { Banknote, PackageCheck } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { getAgentProfile } from '@/features/agents/queries';
import { requireSession } from '@/features/auth/session';
import { getAgentToday, listAgentOrders } from '@/features/orders/agent-queries';
import { AgentOrderCard } from '@/features/orders/components/agent-order-card';
import { isLocale } from '@/shared/i18n/config';
import { formatPrice } from '@/shared/i18n/format';
import { LiveRefresh } from '@/shared/polling/live-refresh';
import { UpdatedAt } from '@/shared/polling/updated-at';
import { EmptyState } from '@/shared/ui/empty-state';

/** The agent's home: today's totals and assigned orders, updating on its own (FR-039, FR-044). */
export default async function AgentHomePage() {
  const session = await requireSession('agent');
  const t = await getTranslations();
  const current = await getLocale();
  const locale = isLocale(current) ? current : 'en';
  const now = new Date();
  const [agent, orders, today] = await Promise.all([
    getAgentProfile(session.subjectId),
    listAgentOrders(session.subjectId),
    getAgentToday(session.subjectId, now),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <LiveRefresh />
      <h1 className="stretch-head text-title font-bold">{t('agent.greeting', { name: agent?.name ?? '' })}</h1>
      <dl className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1 rounded-lg bg-surface p-3.5 shadow-1">
          <dt className="inline-flex items-center gap-1.5 text-small text-muted">
            <PackageCheck aria-hidden="true" className="size-4" />
            {t('agentHome.deliveriesToday')}
          </dt>
          <dd className="stretch-head text-display font-bold" data-testid="today-deliveries">
            {today.deliveries}
          </dd>
        </div>
        <div className="flex flex-col gap-1 rounded-lg bg-surface p-3.5 shadow-1">
          <dt className="inline-flex items-center gap-1.5 text-small text-muted">
            <Banknote aria-hidden="true" className="size-4" />
            {t('agentHome.cashToday')}
          </dt>
          <dd className="stretch-head text-display font-bold" data-testid="today-cash">
            {formatPrice(today.cashCollected, locale)}
          </dd>
        </div>
      </dl>
      <UpdatedAt at={now} />
      {orders.length === 0 ? (
        <EmptyState illustration="NoOrders" title={t('agent.noDeliveriesTitle')} body={t('agent.noDeliveriesBody')} />
      ) : (
        <div className="flex flex-col gap-3">
          <h2 className="text-heading font-bold">{t('agentHome.assigned')}</h2>
          {orders.map((order) => (
            <AgentOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
