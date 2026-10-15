import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { getOptionalSession } from '@/features/auth/session';
import { clearCartAction } from '@/features/cart/actions';
import { BillSummary } from '@/features/cart/components/bill-summary';
import { CartLines } from '@/features/cart/components/cart-lines';
import { CheckoutForm } from '@/features/cart/components/checkout-form';
import { readCart } from '@/features/cart/cookie';
import { getCartView } from '@/features/orders/queries';
import { isLocale } from '@/shared/i18n/config';
import { pickLocalized } from '@/shared/i18n/localized';
import { ButtonLink, buttonClasses } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { LocalizedText } from '@/shared/ui/localized-text';
import { CustomerDock } from '@/features/cart/components/customer-dock';

/**
 * Cart and checkout in one page (research R2): from home, open kitchen, Add, cart bar, Place order
 * is four taps for a signed-in customer (SC-001). Guests sign in here and come back (FR-007).
 */
type Props = { searchParams: Promise<{ leftOut?: string }> };

export default async function CartPage({ searchParams }: Props) {
  const { leftOut } = await searchParams;
  const leftOutCount = Number.parseInt(leftOut ?? '', 10);
  const t = await getTranslations();
  const current = await getLocale();
  const locale = isLocale(current) ? current : 'en';
  const session = await getOptionalSession('customer');
  const view = await getCartView(await readCart(), session?.subjectId ?? null, new Date());

  if (!view || view.lines.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">{t('cart.title')}</h1>
        <EmptyState title={t('cart.empty')} action={<ButtonLink href="/">{t('cart.browse')}</ButtonLink>} />
        <CustomerDock />
      </div>
    );
  }

  const orderable = view.lines.filter((l) => l.available);
  const open = view.kitchen.active && view.kitchen.state.kind === 'open';

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">{t('cart.title')}</h1>
      <Link href={`/kitchens/${view.kitchen.id}`} className="min-h-touch self-start py-2 text-base font-semibold text-primary">
        <LocalizedText pair={view.kitchen.name} />
      </Link>

      {leftOutCount > 0 ? (
        <p role="status" className="rounded-xl border border-warn bg-amber-50 p-3 text-base font-medium" data-testid="reorder-left-out">
          {t('reorder.leftOut', { count: leftOutCount })}
        </p>
      ) : null}
      <CartLines lines={view.lines} />
      {view.removedCount > 0 ? <p className="text-sm font-medium text-warn">{t('cart.removedLines', { count: view.removedCount })}</p> : null}
      <BillSummary bill={view.bill} />
      <p className="text-base text-muted">{t('kitchen.etaRange', { from: view.kitchen.eta.from, to: view.kitchen.eta.to })}</p>

      {!view.kitchen.active ? (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-secondary p-4">
          <p className="text-base font-semibold">{t('errors.kitchenUnavailable')}</p>
          <form action={clearCartAction}>
            <button type="submit" className={buttonClasses('secondary')}>
              {t('cart.clear')}
            </button>
          </form>
        </div>
      ) : !open ? (
        <p className="rounded-xl border border-line bg-secondary p-4 text-base font-semibold" data-testid="ordering-closed">
          {t('cart.orderWhenOpen')}
        </p>
      ) : !session ? (
        <ButtonLink href="/login?next=/cart" className="w-full text-lg">
          {t('cart.signInToCheckOut')}
        </ButtonLink>
      ) : view.addresses.length === 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
          <p className="text-base font-semibold">{t('checkout.needAddress')}</p>
          <ButtonLink href="/addresses/new?next=/cart">{t('checkout.addFirstAddress')}</ButtonLink>
        </div>
      ) : (
        <CheckoutForm
          addresses={view.addresses.map((a) => ({ id: a.id, label: a.label, labelText: a.labelText, house: a.house, landmark: a.landmark }))}
          preselected={view.preselected}
          placeKey={crypto.randomUUID()}
          seenPrices={Object.fromEntries(orderable.map((l) => [l.dishId, l.priceRupees]))}
          grandTotal={view.bill.grandTotal}
          dishNames={Object.fromEntries(view.lines.map((l) => [l.dishId, pickLocalized(l.name, locale)?.text ?? '']))}
        />
      )}
      <CustomerDock />
    </div>
  );
}
