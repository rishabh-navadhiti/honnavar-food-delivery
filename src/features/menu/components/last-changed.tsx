import { useLocale, useTranslations } from 'next-intl';
import { isLocale } from '@/shared/i18n/config';
import { formatDayTime, formatPhone } from '@/shared/i18n/format';

/** Who last changed an item and when (FR-055). Shown on the admin surface. */
export function LastChanged({ role, phone, at }: { role: 'admin' | 'partner' | null; phone: string | null; at: Date | null }) {
  const t = useTranslations('lastChanged');
  const current = useLocale();
  if (!role || !phone || !at) return null;
  return (
    <p data-testid="last-changed" className="text-caption text-muted">
      {t('by', { role: t(role), phone: formatPhone(phone), when: formatDayTime(at, isLocale(current) ? current : 'en') })}
    </p>
  );
}
