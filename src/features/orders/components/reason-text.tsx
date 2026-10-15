import { useTranslations } from 'next-intl';
import type { OrderReason } from '../services/transition';

/** A fixed reason in the viewer's language, plus the "other" note as entered (user-generated text). */
export function ReasonText({ reason, note, className }: { reason: OrderReason; note?: string | null; className?: string }) {
  const t = useTranslations();
  const text = reason === 'other' && note ? note : note ? `${t(`orderReason.${reason}`)}: ${note}` : t(`orderReason.${reason}`);
  return <p className={className}>{t('notifications.reasonLine', { reason: text })}</p>;
}
