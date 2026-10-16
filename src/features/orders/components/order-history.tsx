import { useLocale, useTranslations } from 'next-intl';
import { isLocale } from '@/shared/i18n/config';
import { formatDayTime, formatPhone } from '@/shared/i18n/format';
import type { AdminOrderView } from '../admin-queries';
import { ReasonText } from './reason-text';

/** Every change with who made it and when (FR-018). */
export function OrderHistory({ events }: { events: AdminOrderView['events'] }) {
  const t = useTranslations();
  const current = useLocale();
  const locale = isLocale(current) ? current : 'en';
  return (
    <ol className="flex flex-col gap-2" data-testid="order-history">
      {events.map((event, index) => (
        <li key={index} className="flex flex-col rounded-md bg-surface shadow-1 px-3 py-2">
          <span className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-semibold">{t(`orderEvent.${event.kind}`)}</span>
            <span className="text-small text-muted">{formatDayTime(event.at, locale)}</span>
          </span>
          <span className="text-small">
            {t(`adminOrder.actor.${event.actor}`)}
            {event.actorPhone ? <span className="ms-2 text-muted">{formatPhone(event.actorPhone)}</span> : null}
          </span>
          {event.agentName ? (
            <span className="text-small">
              {event.previousAgentName ? t('adminOrder.agentChange', { from: event.previousAgentName, to: event.agentName }) : event.agentName}
            </span>
          ) : null}
          {event.reason ? <ReasonText reason={event.reason} note={event.reasonNote} className="text-small" /> : null}
        </li>
      ))}
    </ol>
  );
}
