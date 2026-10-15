import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '@/shared/i18n/config';
import { formatPrice } from '@/shared/i18n/format';
import { getCartView } from '@/features/orders/queries';
import { readCart } from '../cookie';

/** Summary of the cart (item count and item total), one tap to the cart; placed by CustomerDock. */
export async function CartBar({ count, itemTotal }: { count: number; itemTotal: number }) {
  if (count === 0) return null;
  const t = await getTranslations('cart');
  const locale = await getLocale();
  return (
    <div>
      <Link
        href="/cart"
        data-testid="cart-bar"
        className="flex min-h-touch items-center justify-between gap-3 rounded-2xl bg-primary px-5 py-3 text-on-primary shadow-lg"
      >
        <span className="text-base font-semibold">
          {t('itemCount', { count })}
          <span aria-hidden="true"> · </span>
          {formatPrice(itemTotal, isLocale(locale) ? locale : 'en')}
        </span>
        <span className="text-base font-bold">
          {t('viewCart')}
          <span aria-hidden="true"> →</span>
        </span>
      </Link>
    </div>
  );
}

/** The cart bar for the device's current cart, wherever a customer browses (home and kitchen pages). */
export async function CurrentCartBar() {
  const view = await getCartView(await readCart(), null, new Date());
  if (!view) return null;
  return <CartBar count={view.lines.reduce((n, l) => n + l.qty, 0)} itemTotal={view.bill.itemTotal} />;
}
