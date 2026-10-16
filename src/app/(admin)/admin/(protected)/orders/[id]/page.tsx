import Link from 'next/link';
import { AddressLabel } from '@/features/addresses/components/address-label';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { requireSession } from '@/features/auth/session';
import { BillSummary } from '@/features/cart/components/bill-summary';
import { getAdminOrder, getDispatchBoard } from '@/features/orders/admin-queries';
import { AdminCancelForm } from '@/features/orders/components/admin-cancel-form';
import { AssignAgentForm } from '@/features/orders/components/assign-agent-form';
import { OrderHistory } from '@/features/orders/components/order-history';
import { OrderNumber } from '@/features/orders/components/order-number';
import { PaymentLabel } from '@/features/orders/components/payment-label';
import { ReasonText } from '@/features/orders/components/reason-text';
import { StatusBadge } from '@/features/orders/components/status-badge';
import { VoiceNotePlayer } from '@/shared/audio/voice-note-player';
import { isLocale } from '@/shared/i18n/config';
import { formatPhone, formatPrice, formatTime } from '@/shared/i18n/format';
import { LiveRefresh } from '@/shared/polling/live-refresh';
import { UpdatedAt } from '@/shared/polling/updated-at';
import { Card } from '@/shared/ui/card';
import { LocalizedText } from '@/shared/ui/localized-text';

type Props = { params: Promise<{ id: string }> };

/** Everything about one order, its history, and assign or cancel (FR-034, FR-035, FR-038). */
export default async function AdminOrderPage({ params }: Props) {
  await requireSession('admin');
  const t = await getTranslations();
  const current = await getLocale();
  const locale = isLocale(current) ? current : 'en';
  const id = z.uuid().safeParse((await params).id);
  const now = new Date();
  const order = id.success ? await getAdminOrder(id.data, now) : null;
  if (!order) notFound();
  const assignable = order.status === 'accepted' || order.status === 'preparing' || order.status === 'ready';
  const agents = assignable ? (await getDispatchBoard(now)).agents : [];

  return (
    <div className="flex flex-col gap-4">
      <LiveRefresh enabled={!order.finished} />
      <Link href="/admin/orders" className="tap inline-flex items-center gap-1 self-start text-base font-semibold text-primary-strong">
        <span aria-hidden="true">← </span>
        {t('dispatch.title')}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-title font-bold">
          <OrderNumber orderNo={order.orderNo} />
        </h1>
        <StatusBadge status={order.status} />
        <UpdatedAt at={now} />
      </div>
      {order.reason ? <ReasonText reason={order.reason} note={order.reasonNote} className="text-base font-medium" /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-2">
          <h2 className="text-heading font-bold">{t('adminOrder.customer')}</h2>
          <p>{order.customer.name ?? t('partnerOrders.customer')}</p>
          <p>{formatPhone(order.customer.phone)}</p>
          <h3 className="mt-2 font-bold">{t('orderPage.deliverTo')}</h3>
          <p>
            <AddressLabel label={order.address.label} labelText={order.address.labelText} />: {order.address.house}
          </p>
          {order.address.street ? <p>{order.address.street}</p> : null}
          <p className="text-muted">{order.address.landmark}</p>
          {order.address.riderNote ? <p className="text-small text-muted">{order.address.riderNote}</p> : null}
          {order.address.voiceNoteId ? <VoiceNotePlayer voiceNoteId={order.address.voiceNoteId} /> : null}
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="text-heading font-bold">
            <LocalizedText pair={order.kitchen.name} />
          </h2>
          {order.kitchen.phone ? <p>{formatPhone(order.kitchen.phone)}</p> : null}
          <ul className="flex flex-col gap-1">
            {order.items.map((item, index) => (
              <li key={index} className="flex justify-between gap-3">
                <LocalizedText pair={item.name} />
                <span>
                  {item.quantity}
                  <span aria-hidden="true"> × </span>
                  {formatPrice(item.priceRupees, locale)}
                </span>
              </li>
            ))}
          </ul>
          <BillSummary bill={order.bill} />
          <p>
            <PaymentLabel method={order.paymentMethod} />
          </p>
          <p className="text-small text-muted">{t('orderPage.expectedBy', { time: formatTime(order.expectedAt, locale) })}</p>
        </Card>
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="text-heading font-bold">{t('adminOrder.agentTitle')}</h2>
        <p data-testid="admin-order-agent">{order.agent ? `${order.agent.name} · ${formatPhone(order.agent.phone)}` : t('adminOrder.noAgent')}</p>
        {assignable ? (
          <div className="max-w-sm">
            <AssignAgentForm orderId={order.id} currentAgentId={order.agent?.id ?? null} agents={agents} />
          </div>
        ) : null}
      </Card>

      {order.finished ? null : <AdminCancelForm orderId={order.id} />}

      <section aria-labelledby="history-title" className="flex flex-col gap-2">
        <h2 id="history-title" className="text-heading font-bold">
          {t('adminOrder.history')}
        </h2>
        <OrderHistory events={order.events} />
      </section>
    </div>
  );
}
