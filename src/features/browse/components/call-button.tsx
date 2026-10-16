import { Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatPhone } from '@/shared/i18n/format';

/** Opens the phone's own dialler; not a telephony integration (Integration Fidelity: real). A 48 px round button. */
export function CallButton({ phone }: { phone: string }) {
  const t = useTranslations('kitchen');
  return (
    <a
      href={`tel:+91${phone}`}
      aria-label={t('callLabel', { phone: formatPhone(phone) })}
      title={t('call')}
      className="grid size-12 shrink-0 place-items-center rounded-full bg-sea-soft text-sea transition-colors duration-(--duration-fast) hover:bg-sea hover:text-surface"
    >
      <Phone aria-hidden="true" className="size-5" />
    </a>
  );
}
