import { useTranslations } from 'next-intl';

export function PaymentLabel({ method }: { method: 'cod' | 'upi_demo' }) {
  const t = useTranslations('paymentMethod');
  return <span>{t(method)}</span>;
}
