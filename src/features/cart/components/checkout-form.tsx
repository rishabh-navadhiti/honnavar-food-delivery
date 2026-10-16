'use client';

import { Banknote, Plus, Smartphone } from 'lucide-react';
import { useActionState, useRef, useState } from 'react';
import Link from 'next/link';
import { AddressLabel } from '@/features/addresses/components/address-label';
import { useLocale, useTranslations } from 'next-intl';
import { placeOrderAction, type PlaceOrderState } from '@/features/orders/actions/customer';
import { isLocale } from '@/shared/i18n/config';
import { formatPrice } from '@/shared/i18n/format';
import { buttonClasses } from '@/shared/ui/button';
import { FormError } from '@/shared/ui/form-message';
import { useErrorText } from '@/shared/ui/use-error-text';
import { PlaceOrderBar } from './place-order-bar';

export type CheckoutAddress = { id: string; label: 'home' | 'work' | 'other'; labelText: string | null; house: string; landmark: string };

/**
 * Address and payment choice, both preselected from the last order (FR-009, FR-010), and "Place
 * order". UPI first shows the demo confirmation sheet (FR-011); closing it places nothing.
 */
export function CheckoutForm({
  addresses,
  preselected,
  placeKey,
  seenPrices,
  grandTotal,
  dishNames,
}: {
  addresses: CheckoutAddress[];
  preselected: { addressId: string | null; paymentMethod: 'cod' | 'upi_demo' };
  placeKey: string;
  seenPrices: Record<string, number>;
  grandTotal: number;
  dishNames: Record<string, string>;
}) {
  const t = useTranslations();
  const current = useLocale();
  const [state, formAction, pending] = useActionState<PlaceOrderState, FormData>(placeOrderAction, {});
  const [payment, setPayment] = useState(preselected.paymentMethod);
  const [sheetOpen, setSheetOpen] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const confirmed = useRef<HTMLInputElement>(null);
  const errors = useErrorText(state.error?.code === 'cart_changed' ? undefined : state.error);
  const price = (n: number) => formatPrice(n, isLocale(current) ? current : 'en');
  const choice =
    'flex min-h-touch cursor-pointer items-center gap-3 rounded-lg border border-line bg-surface px-3.5 py-3 shadow-1 transition-colors duration-(--duration-fast) has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:shadow-[0_0_0_1px_var(--color-primary)]';
  const section = 'flex flex-col gap-2';
  const heading = 'mb-1 text-heading font-bold';

  return (
    <form
      ref={form}
      action={formAction}
      onSubmit={(event) => {
        if (payment === 'upi_demo' && confirmed.current?.value !== 'true') {
          event.preventDefault();
          setSheetOpen(true);
        }
      }}
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="placeKey" value={placeKey} />
      <input type="hidden" name="seenPrices" value={JSON.stringify(seenPrices)} />
      <input ref={confirmed} type="hidden" name="upiConfirmed" defaultValue="" />

      <fieldset className={section}>
        <legend className={heading}>{t('checkout.deliverTo')}</legend>
        {addresses.map((a) => (
          <label key={a.id} className={choice}>
            <input type="radio" name="addressId" value={a.id} defaultChecked={a.id === preselected.addressId} className="size-5 accent-primary" />
            <span className="flex flex-col">
              <span className="text-base font-bold">
                <AddressLabel label={a.label} labelText={a.labelText} />
              </span>
              <span className="text-small">{a.house}</span>
              <span className="text-small text-muted">{a.landmark}</span>
            </span>
          </label>
        ))}
        <Link href="/addresses/new?next=/cart" className="inline-flex min-h-touch items-center gap-1.5 self-start text-base font-semibold text-primary-strong">
          <Plus aria-hidden="true" className="size-5" />
          {t('checkout.addAddress')}
        </Link>
      </fieldset>

      <fieldset className={section}>
        <legend className={heading}>{t('checkout.payment')}</legend>
        {(['cod', 'upi_demo'] as const).map((method) => (
          <label key={method} className={choice}>
            <input
              type="radio"
              name="paymentMethod"
              value={method}
              checked={payment === method}
              onChange={() => setPayment(method)}
              className="size-5 accent-primary"
            />
            {method === 'cod' ? <Banknote aria-hidden="true" className="size-5 text-muted" /> : <Smartphone aria-hidden="true" className="size-5 text-muted" />}
            <span className="text-base font-semibold">{method === 'cod' ? t('paymentMethod.cod') : t('paymentMethod.upiChoice')}</span>
          </label>
        ))}
      </fieldset>

      {state.error?.code === 'cart_changed' ? (
        <div role="alert" className="flex flex-col gap-1 rounded-lg bg-warn-soft p-3 text-ink" data-testid="cart-changed">
          <p className="text-base font-semibold">{t('checkout.cartChanged')}</p>
          <ul className="list-disc ps-5 text-small">
            {(state.changes ?? []).map((change) => (
              <li key={change.dishId}>
                {change.kind === 'price'
                  ? t('checkout.changedPrice', { name: dishNames[change.dishId] ?? '', from: price(change.oldPrice), to: price(change.newPrice) })
                  : change.kind === 'unavailable'
                    ? t('checkout.changedUnavailable', { name: dishNames[change.dishId] ?? '' })
                    : t('checkout.changedRemoved')}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <FormError message={errors.form ?? errors.field('addressId', 'paymentMethod', 'placeKey', 'seenPrices', 'upiConfirmed')} />

      <PlaceOrderBar>
        <button type="submit" disabled={pending} className={buttonClasses('primary', 'min-h-[54px] w-full text-[1.06rem]')}>
          {pending ? t('checkout.placing') : t('checkout.placeOrder', { amount: price(grandTotal) })}
        </button>
      </PlaceOrderBar>

      {sheetOpen ? (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center">
          <div aria-hidden="true" className="absolute inset-0 animate-fade-in bg-scrim" onClick={() => setSheetOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upi-title"
            className="relative flex w-full max-w-md animate-sheet-up flex-col gap-4 rounded-t-xl bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-3 sm:rounded-md"
          >
            <h2 id="upi-title" className="text-title font-bold">
              {t('upiSheet.title')}
            </h2>
            <p className="stretch-head text-display font-bold">{price(grandTotal)}</p>
            <p className="rounded-md bg-warn-soft p-3 text-base font-medium" data-testid="upi-demo-notice">
              {t('upiSheet.demoNotice')}
            </p>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (confirmed.current) confirmed.current.value = 'true';
                setSheetOpen(false);
                form.current?.requestSubmit();
              }}
              className={buttonClasses('primary', 'w-full')}
            >
              {t('upiSheet.confirm')}
            </button>
            <button type="button" onClick={() => setSheetOpen(false)} className={buttonClasses('secondary', 'w-full')}>
              {t('upiSheet.close')}
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
