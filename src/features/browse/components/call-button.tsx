import { useTranslations } from 'next-intl';
import { formatPhone } from '@/shared/i18n/format';
import { buttonClasses } from '@/shared/ui/button';

/** Opens the phone's own dialler; not a telephony integration (Integration Fidelity: real). */
export function CallButton({ phone }: { phone: string }) {
  const t = useTranslations('kitchen');
  return (
    <a
      href={`tel:+91${phone}`}
      aria-label={t('callLabel', { phone: formatPhone(phone) })}
      className={buttonClasses('primary', 'w-full text-lg')}
    >
      <span aria-hidden="true">☎</span>
      {t('call')}
    </a>
  );
}
