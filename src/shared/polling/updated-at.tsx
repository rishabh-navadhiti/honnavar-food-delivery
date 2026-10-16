import { getLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '../i18n/config';
import { formatTime } from '../i18n/format';

/**
 * "Updated 1:30 pm": the server render time of a polled page. If a refresh fails, the last render
 * stays with its stale time, so people can see the status may be old (spec edge case).
 */
export async function UpdatedAt({ at }: { at: Date }) {
  const t = await getTranslations('polling');
  const locale = await getLocale();
  return (
    <p className="text-caption text-muted" aria-live="polite">
      {t('updatedAt', { time: formatTime(at, isLocale(locale) ? locale : 'en') })}
    </p>
  );
}
