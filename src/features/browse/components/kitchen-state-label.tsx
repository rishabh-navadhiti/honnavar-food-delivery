import { Clock, MoonStar, PauseCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { isLocale, type Locale } from '@/shared/i18n/config';
import { formatTime, formatWeekday } from '@/shared/i18n/format';
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

/**
 * Open / Closed (with next opening) / Temporarily closed (with reopening) / Hours not set (FR-039),
 * as an icon or dot plus words, never colour alone.
 */
export function KitchenStateLabel({ state, now }: { state: KitchenState; now: Date }) {
  const t = useTranslations('kitchenState');
  const when = useWhen(now);
  let text: string;
  let mark;
  let tone = 'text-closed';
  switch (state.kind) {
    case 'open':
      tone = 'text-open';
      text = t('open');
      mark = <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-current" />;
      break;
    case 'closed':
      text = t('closedOpens', { when: when(state.nextOpening) });
      mark = <MoonStar aria-hidden="true" className="size-4 shrink-0" />;
      break;
    case 'temporarilyClosed':
      tone = 'text-warn';
      text = state.reopensAt ? t('temporarilyClosedUntil', { when: when(state.reopensAt) }) : t('temporarilyClosed');
      mark = <PauseCircle aria-hidden="true" className="size-4 shrink-0" />;
      break;
    case 'hoursNotSet':
      text = t('hoursNotSet');
      mark = <Clock aria-hidden="true" className="size-4 shrink-0" />;
      break;
  }
  return (
    <span data-testid="kitchen-state" data-state={state.kind} className={`inline-flex items-center gap-1.5 text-small font-semibold ${tone}`}>
      {mark}
      {text}
    </span>
  );
}
