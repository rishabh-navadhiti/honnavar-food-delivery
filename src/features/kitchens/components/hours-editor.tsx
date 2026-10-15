'use client';

import { useActionState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { isLocale } from '@/shared/i18n/config';
import { formatWeekday } from '@/shared/i18n/format';
import { Button } from '@/shared/ui/button';
import { saveHoursAction, type HoursFormState } from '../actions/operations';
import { toHHMM, WEEKDAYS, type WeekHours } from '../domain/hours';
import { ScopeFields } from './scope-fields';

/** Values for the form fields from stored hours. Midnight (1440) is shown as 00:00. */
function initialValues(week: WeekHours): Record<string, string> {
  const values: Record<string, string> = {};
  for (const day of WEEKDAYS) {
    if (week[day].length === 0) values[`h${day}_closed`] = 'on';
    week[day].forEach((r, i) => {
      values[`h${day}_${i + 1}_opens`] = toHHMM(r.opens);
      values[`h${day}_${i + 1}_closes`] = r.closes === 1440 ? '00:00' : toHHMM(r.closes);
    });
  }
  return values;
}

/** Weekly hours editor (FR-032): closed, or up to two ranges per day; errors shown per day. */
export function HoursEditor({ surface, kitchenId, week }: { surface: 'partner' | 'admin'; kitchenId: string; week: WeekHours }) {
  const t = useTranslations();
  const current = useLocale();
  const locale = isLocale(current) ? current : 'en';
  const [state, formAction, pending] = useActionState<HoursFormState, FormData>(saveHoursAction, {});
  const values = state.values ?? initialValues(week);
  // Re-mount the fields after each save so defaultValue reflects what was submitted.
  const formKey = JSON.stringify(values);

  return (
    <form action={formAction} key={formKey} className="flex flex-col gap-4" noValidate>
      <ScopeFields surface={surface} kitchenId={kitchenId} />
      <p className="text-base text-muted">{t('hoursEditor.help')}</p>
      <p className="text-sm text-muted">{t('hoursEditor.midnightHint')}</p>
      {WEEKDAYS.map((day) => {
        const errorKey = state.error?.fieldErrors?.[`hours.${day}`];
        const dayName = formatWeekday(day, locale);
        return (
          <fieldset
            key={day}
            aria-describedby={errorKey ? `hours-${day}-error` : undefined}
            className={`flex flex-col gap-2 rounded-2xl border bg-surface p-3 ${errorKey ? 'border-danger' : 'border-line'}`}
            data-testid={`hours-day-${day}`}
          >
            <legend className="px-1 text-base font-bold">{dayName}</legend>
            <label className="flex min-h-touch items-center gap-3">
              <input type="checkbox" name={`h${day}_closed`} defaultChecked={values[`h${day}_closed`] === 'on'} className="size-6 accent-primary" />
              <span>{t('hoursEditor.closedAllDay')}</span>
            </label>
            {[1, 2].map((slot) => (
              <div key={slot} className="grid grid-cols-2 gap-2">
                <span className="col-span-2 text-sm font-semibold text-muted">
                  {slot === 1 ? t('hoursEditor.firstRange') : t('hoursEditor.secondRange')}
                </span>
                <label className="flex flex-col gap-1 text-sm">
                  <span>{t('hoursEditor.opens')}</span>
                  <input
                    type="time"
                    name={`h${day}_${slot}_opens`}
                    defaultValue={values[`h${day}_${slot}_opens`] ?? ''}
                    aria-label={`${dayName} · ${slot === 1 ? t('hoursEditor.firstRange') : t('hoursEditor.secondRange')} · ${t('hoursEditor.opens')}`}
                    className="min-h-touch rounded-xl border border-line px-2 text-base"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span>{t('hoursEditor.closes')}</span>
                  <input
                    type="time"
                    name={`h${day}_${slot}_closes`}
                    defaultValue={values[`h${day}_${slot}_closes`] ?? ''}
                    aria-label={`${dayName} · ${slot === 1 ? t('hoursEditor.firstRange') : t('hoursEditor.secondRange')} · ${t('hoursEditor.closes')}`}
                    className="min-h-touch rounded-xl border border-line px-2 text-base"
                  />
                </label>
              </div>
            ))}
            {errorKey ? (
              <p id={`hours-${day}-error`} role="alert" className="text-sm font-medium text-danger">
                {t(`errors.${errorKey}`)}
              </p>
            ) : null}
          </fieldset>
        );
      })}
      {state.error && !state.error.fieldErrors ? (
        <p role="alert" className="font-medium text-danger">
          {t(`errors.${state.error.code === 'not_found' ? 'notFound' : state.error.code}`)}
        </p>
      ) : null}
      <div className="sticky bottom-16 flex items-center gap-3 bg-page py-2">
        <Button type="submit" disabled={pending} className="flex-1 text-lg">
          {pending ? t('common.saving') : t('hoursEditor.save')}
        </Button>
        {state.saved ? (
          <span role="status" className="font-medium text-open">
            {t('hoursEditor.saved')}
          </span>
        ) : null}
      </div>
    </form>
  );
}
