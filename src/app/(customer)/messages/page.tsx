import { getTranslations } from 'next-intl/server';
import { requireSession } from '@/features/auth/session';
import { MessageList } from '@/features/notifications/components/message-list';
import { listMessages } from '@/features/notifications/queries';
import { CustomerDock } from '@/features/cart/components/customer-dock';
import { BackLink } from '@/shared/ui/back-link';

export default async function CustomerMessagesPage() {
  const session = await requireSession('customer');
  const t = await getTranslations();
  const messages = await listMessages({ kind: 'customer', customerId: session.subjectId });
  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/account" label={t('backLinks.account')} />
      <h1 className="text-2xl font-bold">{t('messageLog.title')}</h1>
      <p className="text-sm text-muted">{t('messageLog.intro')}</p>
      <MessageList messages={messages} orderHref={(id) => `/orders/${id}`} />
      <CustomerDock />
    </div>
  );
}
