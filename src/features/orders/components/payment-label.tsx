import { Banknote, Smartphone } from 'lucide-react';
import { useTranslations } from 'next-intl';

/** Cash on delivery or "Paid by UPI (demo)", with an icon beside the words. */
export function PaymentLabel({ method }: { method: 'cod' | 'upi_demo' }) {
  const t = useTranslations('paymentMethod');
  const Icon = method === 'cod' ? Banknote : Smartphone;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted" />
      {t(method)}
    </span>
  );
}
