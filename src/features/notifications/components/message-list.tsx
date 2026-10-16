import { MessageSquareText } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ReasonText } from '@/features/orders/components/reason-text';
import type { OrderReason } from '@/features/orders/services/transition';
import { isLocale } from '@/shared/i18n/config';
import { formatDayTime, formatPrice } from '@/shared/i18n/format';
import { EmptyState } from '@/shared/ui/empty-state';
import { LocalizedText } from '@/shared/ui/localized-text';
import type { MessageView } from '../queries';

/**
 * The SMS and WhatsApp stand-in (FR-045, FR-047): each update rendered from its translation key in
 * the viewer's language, labelled as a demo message that was not sent.
 */
export function MessageList({ messages, orderHref }: { messages: MessageView[]; orderHref: (orderId: string) => string }) {
  const t = useTranslations();
  const current = useLocale();
  const locale = isLocale(current) ? current : 'en';
  if (messages.length === 0) return <EmptyState illustration="NoMessages" title={t('messageLog.empty')} />;
  return (
    <ul className="flex flex-col gap-2" data-testid="message-list">
      {messages.map((m) => (
        <li key={m.id} data-kind={m.kind} className="flex flex-col gap-1 rounded-lg bg-surface p-3.5 shadow-1">
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-soft px-2 py-0.5 text-caption font-semibold text-warn">
              <MessageSquareText aria-hidden="true" className="size-3.5" />
              {t('notifications.demoLabel')}
            </span>
            <span className="text-small text-muted">{formatDayTime(m.createdAt, locale)}</span>
          </span>
          <Link href={orderHref(m.orderId)} className="flex min-h-touch items-center text-base font-semibold text-ink underline-offset-4 hover:underline">
            {t(`notifications.${m.kind}`, {
              orderNo: String(m.params.orderNo),
              amount: m.params.amount !== undefined ? formatPrice(m.params.amount, locale) : '',
              agentName: m.agentName ?? '',
            })}
          </Link>
          {m.params.reason ? <ReasonText reason={m.params.reason as OrderReason} note={m.params.reasonNote} className="text-small" /> : null}
          <span className="text-small text-muted">
            <LocalizedText pair={m.kitchenName} />
          </span>
        </li>
      ))}
    </ul>
  );
}
