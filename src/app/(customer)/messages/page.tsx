import { getTranslations } from 'next-intl/server';
import { requireSession } from '@/features/auth/session';
import { MessageList } from '@/features/notifications/components/message-list';
import { listMessages } from '@/features/notifications/queries';

export default async function CustomerMessagesPage() {
  const session = await requireSession('customer');
  const t = await getTranslations('messageLog');
  const messages = await listMessages({ kind: 'customer', customerId: session.subjectId });
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="text-sm text-muted">{t('intro')}</p>
      <MessageList messages={messages} orderHref={(id) => `/orders/${id}`} />
    </div>
  );
}
