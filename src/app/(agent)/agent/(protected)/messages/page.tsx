import { getTranslations } from 'next-intl/server';
import { requireSession } from '@/features/auth/session';
import { MessageList } from '@/features/notifications/components/message-list';
import { listMessages } from '@/features/notifications/queries';

export default async function AgentMessagesPage() {
  const session = await requireSession('agent');
  const t = await getTranslations('messageLog');
  const messages = await listMessages({ kind: 'agent', agentId: session.subjectId });
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title font-bold">{t('title')}</h1>
      <p className="text-small text-muted">{t('intro')}</p>
      <MessageList messages={messages} orderHref={(id) => `/agent/orders/${id}`} />
    </div>
  );
}
