import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { requireSession } from '@/features/auth/session';
import { getAgentOrder } from '@/features/orders/agent-queries';
import { AgentOrderDetail } from '@/features/orders/components/agent-order-detail';
import { OrderNumber } from '@/features/orders/components/order-number';
import { ReasonText } from '@/features/orders/components/reason-text';
import { LiveRefresh } from '@/shared/polling/live-refresh';
import { UpdatedAt } from '@/shared/polling/updated-at';

type Props = { params: Promise<{ id: string }> };

/** One assigned order (FR-040 to FR-043); explains when it was reassigned away or cancelled. */
export default async function AgentOrderPage({ params }: Props) {
  const session = await requireSession('agent');
  const t = await getTranslations('agentOrder');
  const id = z.uuid().safeParse((await params).id);
  const now = new Date();
  const view = id.success ? await getAgentOrder(session.subjectId, id.data) : null;
  if (!view) notFound();
  const live = view.state === 'mine' && view.order.status !== 'delivered';
  return (
    <div className="flex flex-col gap-4">
      <LiveRefresh enabled={live} />
      <Link href="/agent" className="min-h-touch self-start py-3 text-base font-medium text-primary">
        <span aria-hidden="true">← </span>
        {t('back')}
      </Link>
      <UpdatedAt at={now} />
      {view.state === 'mine' ? (
        <AgentOrderDetail order={view.order} />
      ) : (
        <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4" data-testid="agent-order-gone">
          <h1 className="text-xl font-bold">
            <OrderNumber orderNo={view.orderNo} />
          </h1>
          <p className="text-base font-semibold">{view.state === 'reassigned' ? t('reassignedAway') : t('cancelled')}</p>
          {view.state === 'cancelled' && view.reason ? <ReasonText reason={view.reason} note={view.reasonNote} className="text-base" /> : null}
        </div>
      )}
    </div>
  );
}
