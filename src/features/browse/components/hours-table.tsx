import { useLocale, useTranslations } from 'next-intl';
import { isLocale, type Locale } from '@/shared/i18n/config';
import { formatTime, formatWeekday } from '@/shared/i18n/format';
import { WEEKDAYS, type WeekHours } from '../../kitchens/domain/hours';
import { toIst } from '../../kitchens/domain/ist';

/** Times are minutes after midnight IST; format them through a reference IST date. */
function minutesToDate(minutes: number): Date {
  return new Date(Date.parse('2026-10-12T00:00:00+05:30') + minutes * 60_000);
}

export function HoursTable({ hours, now }: { hours: WeekHours; now: Date }) {
  const t = useTranslations('hours');
  const current = useLocale();
  const locale: Locale = isLocale(current) ? current : 'en';
  const today = toIst(now).weekday;
  return (
    <table className="w-full text-base">
      <tbody>
        {WEEKDAYS.map((day) => (
          <tr key={day} className={day === today ? 'font-bold' : ''}>
            <th scope="row" className="py-1 pe-4 text-start font-medium">
              {formatWeekday(day, locale)}
              {day === today ? <span className="sr-only">{t('today')}</span> : null}
            </th>
            <td className="py-1 text-end">
              {hours[day].length === 0
                ? t('closed')
                : hours[day]
                    .map((r) =>
                      t('range', { opens: formatTime(minutesToDate(r.opens), locale), closes: formatTime(minutesToDate(r.closes), locale) }),
                    )
                    .join(', ')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
