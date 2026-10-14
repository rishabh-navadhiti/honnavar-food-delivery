import { useLocale, useTranslations } from 'next-intl';
import { isLocale } from '@/shared/i18n/config';
import { formatTime, formatWeekday } from '@/shared/i18n/format';
import { buttonClasses } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { closeTemporarilyAction, reopenAction } from '../actions/operations';
import { istDaysBetween, toIst } from '../domain/ist';
import type { KitchenState } from '../domain/state';
import { ScopeFields } from './scope-fields';

/** "Close for now" / "Reopen" (FR-031): one obvious action, plain forms that work without JS. */
export function ClosureControl({
  surface,
  kitchenId,
  state,
  now,
}: {
  surface: 'partner' | 'admin';
  kitchenId: string;
  state: KitchenState;
  now: Date;
}) {
  const t = useTranslations();
  const current = useLocale();
  const locale = isLocale(current) ? current : 'en';
  const when = (at: Date) => {
    const time = formatTime(at, locale);
    const days = istDaysBetween(now, at);
    if (days === 0) return t('kitchenState.today', { time });
    if (days === 1) return t('kitchenState.tomorrow', { time });
    return t('kitchenState.onDay', { day: formatWeekday(toIst(at).weekday, locale), time });
  };

  if (state.kind === 'temporarilyClosed') {
    return (
      <Card className="flex flex-col gap-3" data-testid="closure-control">
        <p className="text-base font-semibold">
          {state.reopensAt ? t('closure.closedUntil', { when: when(state.reopensAt) }) : t('closure.closedIndefinitely')}
        </p>
        <form action={reopenAction}>
          <ScopeFields surface={surface} kitchenId={kitchenId} />
          <button type="submit" className={buttonClasses('primary', 'w-full text-lg')}>
            {t('closure.reopen')}
          </button>
        </form>
      </Card>
    );
  }
  return (
    <Card className="flex flex-col gap-3" data-testid="closure-control">
      <p className="text-base text-muted">{t('closure.closeHelp')}</p>
      <form action={closeTemporarilyAction}>
        <ScopeFields surface={surface} kitchenId={kitchenId} />
        <button type="submit" className={buttonClasses('danger', 'w-full text-lg')}>
          {t('closure.closeNow')}
        </button>
      </form>
    </Card>
  );
}
