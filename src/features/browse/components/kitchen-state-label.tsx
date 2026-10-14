import { useLocale, useTranslations } from 'next-intl';
import { isLocale, type Locale } from '@/shared/i18n/config';
import { formatTime, formatWeekday } from '@/shared/i18n/format';
import { Badge } from '@/shared/ui/badge';
import { istDaysBetween, toIst } from '../../kitchens/domain/ist';
import type { KitchenState } from '../../kitchens/domain/state';

function useWhen(now: Date) {
  const t = useTranslations('kitchenState');
  const current = useLocale();
  const locale: Locale = isLocale(current) ? current : 'en';
  return (at: Date) => {
    const time = formatTime(at, locale);
    const days = istDaysBetween(now, at);
    if (days === 0) return t('today', { time });
    if (days === 1) return t('tomorrow', { time });
    return t('onDay', { day: formatWeekday(toIst(at).weekday, locale), time });
  };
}

/** Open / Closed (with next opening) / Temporarily closed (with reopening) / Hours not set (FR-039). */
export function KitchenStateLabel({ state, now }: { state: KitchenState; now: Date }) {
  const t = useTranslations('kitchenState');
  const when = useWhen(now);
  let tone: 'open' | 'closed' | 'warn' = 'closed';
  let text: string;
  switch (state.kind) {
    case 'open':
      tone = 'open';
      text = t('open');
      break;
    case 'closed':
      text = t('closedOpens', { when: when(state.nextOpening) });
      break;
    case 'temporarilyClosed':
      tone = 'warn';
      text = state.reopensAt ? t('temporarilyClosedUntil', { when: when(state.reopensAt) }) : t('temporarilyClosed');
      break;
    case 'hoursNotSet':
      text = t('hoursNotSet');
      break;
  }
  return (
    <span data-testid="kitchen-state" data-state={state.kind}>
      <Badge tone={tone}>
        <span aria-hidden="true">{state.kind === 'open' ? '●' : '○'}</span>
        {text}
      </Badge>
    </span>
  );
}
