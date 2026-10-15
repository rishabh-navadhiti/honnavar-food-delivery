import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { requireSession } from '@/features/auth/session';
import { AcknowledgeOrder } from '@/features/orders/components/acknowledge-order';
import { PartnerOrderCard } from '@/features/orders/components/partner-order-card';
import { getPartnerOrder } from '@/features/orders/partner-queries';
import { isFinal } from '@/features/orders/domain/lifecycle';
import { LiveRefresh } from '@/shared/polling/live-refresh';
import { UpdatedAt } from '@/shared/polling/updated-at';
import { BackLink } from '@/shared/ui/back-link';

type Props = { params: Promise<{ id: string }> };

export default async function PartnerOrderPage({ params }: Props) {
  const session = await requireSession('partner');
  const t = await getTranslations('partnerOrders');
  const id = z.uuid().safeParse((await params).id);
  const now = new Date();
  const order = id.success ? await getPartnerOrder(session.kitchenId!, id.data, now) : null;
  if (!order) notFound();
  return (
    <div className="flex flex-col gap-4">
      <AcknowledgeOrder orderId={order.id} />
      <LiveRefresh enabled={!isFinal(order.status)} />
      <BackLink href="/partner/orders" label={t('allOrders')} />
      <UpdatedAt at={now} />
      <PartnerOrderCard order={order} link={false} />
    </div>
  );
}
