import { useLocale, useTranslations } from 'next-intl';
import type { CartLineView } from '@/features/orders/queries';
import { isLocale } from '@/shared/i18n/config';
import { formatPrice } from '@/shared/i18n/format';
import { LocalizedText } from '@/shared/ui/localized-text';
import { VegMark } from '@/shared/ui/veg-mark';
import { AddToCart } from './add-to-cart';

/** Cart lines with steppers; a line that can no longer be ordered says so and stays out of the bill. */
export function CartLines({ lines }: { lines: CartLineView[] }) {
  const t = useTranslations();
  const current = useLocale();
  const price = (n: number) => formatPrice(n, isLocale(current) ? current : 'en');
  return (
    <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface px-4">
      {lines.map((line) => (
        <li key={line.dishId} className={`flex items-start justify-between gap-3 py-3 ${line.available ? '' : 'opacity-60'}`} data-testid="cart-line">
          <div className="flex min-w-0 flex-col gap-1">
            <VegMark isVeg={line.isVeg} />
            <p className="text-base font-semibold">
              <LocalizedText pair={line.name} />
            </p>
            <p className="text-sm text-muted">
              {price(line.priceRupees)}
              <span aria-hidden="true"> × </span>
              {line.qty}
              <span aria-hidden="true"> = </span>
              <span className="font-semibold text-ink">{price(line.lineTotal)}</span>
            </p>
            {line.available ? null : <p className="text-sm font-medium text-danger">{t('cart.lineUnavailable')}</p>}
          </div>
          <AddToCart dishId={line.dishId} qty={line.qty} />
        </li>
      ))}
    </ul>
  );
}
