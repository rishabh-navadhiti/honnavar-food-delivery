import { useLocale, useTranslations } from 'next-intl';
import { isLocale } from '@/shared/i18n/config';
import { formatPrice } from '@/shared/i18n/format';

/** Item total, flat delivery fee and grand total in rupees (FR-003). */
export function BillSummary({ bill }: { bill: { itemTotal: number; deliveryFee: number; grandTotal: number } }) {
  const t = useTranslations('cart');
  const current = useLocale();
  const price = (n: number) => formatPrice(n, isLocale(current) ? current : 'en');
  return (
    <dl className="flex flex-col gap-1.5 rounded-lg bg-surface p-4 text-base shadow-1" data-testid="bill">
      <div className="flex justify-between text-muted">
        <dt>{t('itemTotal')}</dt>
        <dd data-testid="bill-item-total">{price(bill.itemTotal)}</dd>
      </div>
      <div className="flex justify-between text-muted">
        <dt>{t('deliveryFee')}</dt>
        <dd data-testid="bill-delivery-fee">{price(bill.deliveryFee)}</dd>
      </div>
      <div className="mt-1 flex justify-between border-t border-dashed border-line-strong/45 pt-2.5 text-heading font-bold">
        <dt>{t('grandTotal')}</dt>
        <dd data-testid="bill-grand-total">{price(bill.grandTotal)}</dd>
      </div>
    </dl>
  );
}
