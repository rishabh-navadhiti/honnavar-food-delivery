import { getTranslations } from 'next-intl/server';
import { requireSession } from '@/features/auth/session';
import { MessageList } from '@/features/notifications/components/message-list';
import { listMessages } from '@/features/notifications/queries';

/** The kitchen's message log, shared by every number on its sign-in list (FR-047). */
export default async function PartnerMessagesPage() {
  const session = await requireSession('partner');
  const t = await getTranslations('messageLog');
  const messages = await listMessages({ kind: 'kitchen', kitchenId: session.kitchenId! });
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title font-bold">{t('title')}</h1>
      <p className="text-small text-muted">{t('intro')}</p>
      <MessageList messages={messages} orderHref={(id) => `/partner/orders/${id}`} />
    </div>
  );
}
