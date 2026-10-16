import { Bike, Plus, Store } from 'lucide-react';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { getOptionalSession } from '@/features/auth/session';
import { clearCartAction } from '@/features/cart/actions';
import { BillSummary } from '@/features/cart/components/bill-summary';
import { CartLines } from '@/features/cart/components/cart-lines';
import { CheckoutForm } from '@/features/cart/components/checkout-form';
import { RefreshIfStale } from '@/features/cart/components/refresh-if-stale';
import { readCart } from '@/features/cart/cookie';
import { getCartView } from '@/features/orders/queries';
import { isLocale } from '@/shared/i18n/config';
import { pickLocalized } from '@/shared/i18n/localized';
import { ButtonLink, buttonClasses } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { LocalizedText } from '@/shared/ui/localized-text';
import { CustomerTabBar } from '@/features/cart/components/customer-tab-bar';
import { PlaceOrderBar } from '@/features/cart/components/place-order-bar';
import { BackLink } from '@/shared/ui/back-link';

/**
 * Cart and checkout in one page (research R2): from home, open kitchen, Add, cart bar, Place order
 * is four taps for a signed-in customer (SC-001). Guests sign in here and come back (FR-007).
 */
type Props = { searchParams: Promise<{ leftOut?: string }> };

/** Always rendered from the current cart cookie, never from a cache (follow-up fix). */
export const dynamic = 'force-dynamic';

export default async function CartPage({ searchParams }: Props) {
  const { leftOut } = await searchParams;
  const leftOutCount = Number.parseInt(leftOut ?? '', 10);
  const t = await getTranslations();
  const current = await getLocale();
  const locale = isLocale(current) ? current : 'en';
  const session = await getOptionalSession('customer');
  const now = new Date();
  const view = await getCartView(await readCart(), session?.subjectId ?? null, now);

  if (!view || view.lines.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink href="/" label={t('backLinks.home')} />
        <h1 className="text-title font-bold">{t('cart.title')}</h1>
        <EmptyState illustration="EmptyCart" title={t('cart.empty')} action={<ButtonLink href="/">{t('cart.browse')}</ButtonLink>} />
        <CustomerTabBar current="cart" />
      </div>
    );
  }

  const orderable = view.lines.filter((l) => l.available);
  const open = view.kitchen.active && view.kitchen.state.kind === 'open';
  // The place-order bar replaces the tabs whenever there is a next step to put in it (FR-013a).
  const placeBar = open && (!session || view.addresses.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <RefreshIfStale renderedAt={now.getTime()} />
      <BackLink href={`/kitchens/${view.kitchen.id}`} label={t('backLinks.kitchen')} />
      <div className="flex flex-col gap-1">
        <h1 className="text-title font-bold">{t('cart.title')}</h1>
        <p className="flex items-center gap-1.5 text-base font-semibold text-muted">
          <Store aria-hidden="true" className="size-4 shrink-0" />
          <LocalizedText pair={view.kitchen.name} />
        </p>
      </div>

      {leftOutCount > 0 ? (
        <p role="status" className="rounded-md bg-warn-soft p-3 text-base font-medium" data-testid="reorder-left-out">
          {t('reorder.leftOut', { count: leftOutCount })}
        </p>
      ) : null}
      <CartLines lines={view.lines} />
      <Link
        href={`/kitchens/${view.kitchen.id}`}
        data-testid="add-more"
        className="inline-flex min-h-touch items-center gap-2 self-start rounded-md px-1 text-base font-semibold text-primary-strong"
      >
        <Plus aria-hidden="true" className="size-5 shrink-0" />
        {t('cart.addMoreFrom', { kitchen: pickLocalized(view.kitchen.name, locale)?.text ?? '' })}
      </Link>
      {view.removedCount > 0 ? <p className="text-small font-semibold text-warn">{t('cart.removedLines', { count: view.removedCount })}</p> : null}
      <BillSummary bill={view.bill} />
      <p className="flex items-center gap-2 text-base text-muted">
        <Bike aria-hidden="true" className="size-5 shrink-0 text-sea" />
        {t('kitchen.etaRange', { from: view.kitchen.eta.from, to: view.kitchen.eta.to })}
      </p>

      {!view.kitchen.active ? (
        <div className="flex flex-col gap-3 rounded-lg bg-closed-soft p-4">
          <p className="text-base font-semibold">{t('errors.kitchenUnavailable')}</p>
          <form action={clearCartAction}>
            <button type="submit" className={buttonClasses('secondary')}>
              {t('cart.clear')}
            </button>
          </form>
        </div>
      ) : !open ? (
        <p className="rounded-lg bg-closed-soft p-4 text-base font-semibold" data-testid="ordering-closed">
          {t('cart.orderWhenOpen')}
        </p>
      ) : !session ? (
        <PlaceOrderBar>
          <ButtonLink href="/login?next=/cart" className="min-h-[54px] w-full text-[1.06rem]">
            {t('cart.signInToCheckOut')}
          </ButtonLink>
        </PlaceOrderBar>
      ) : view.addresses.length === 0 ? (
        <div className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-1">
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
      <CustomerTabBar current="cart" onCartPage={placeBar} />
    </div>
  );
}
