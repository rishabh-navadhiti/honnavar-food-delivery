'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MAX_QUANTITY } from '@/features/orders/domain/bill';
import { buttonClasses } from '@/shared/ui/button';
import { useErrorText } from '@/shared/ui/use-error-text';
import { addToCartAction, setCartQuantityAction, type CartActionState } from '../actions';

/**
 * "Add", then a −/qty/+ stepper (FR-001), with 48 px targets. The kitchen page shows it only for
 * available dishes of an open kitchen (FR-006). A dish from another kitchen asks before replacing
 * the cart (FR-002).
 */
export function AddToCart({ dishId, qty }: { dishId: string; qty: number }) {
  const t = useTranslations('cart');
  const [addState, addAction, adding] = useActionState<CartActionState, FormData>(addToCartAction, {});
  const [qtyState, qtyAction, changing] = useActionState<CartActionState, FormData>(setCartQuantityAction, {});
  const [dismissed, setDismissed] = useState<CartActionState | null>(null);
  const busy = adding || changing;
  const askReplace = addState.error?.code === 'other_kitchen' && dismissed !== addState;
  const error = askReplace ? undefined : (addState.error ?? qtyState.error);
  const { form: errorText } = useErrorText(error);

  return (
    <div className="flex flex-col items-end gap-2">
      {qty === 0 ? (
        <form action={addAction}>
          <input type="hidden" name="dishId" value={dishId} />
          <button type="submit" disabled={busy} className={buttonClasses('primary', 'min-w-24')}>
            {t('add')}
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-1" role="group" aria-label={t('quantity')}>
          <form action={qtyAction}>
            <input type="hidden" name="dishId" value={dishId} />
            <input type="hidden" name="qty" value={qty - 1} />
            <button type="submit" disabled={busy} aria-label={t('oneLess')} className={buttonClasses('secondary', 'min-w-12 px-0 text-xl')}>
              −
            </button>
          </form>
          <span className="min-w-8 text-center text-lg font-bold" aria-live="polite" data-testid="cart-qty">
            {qty}
          </span>
          <form action={qtyAction}>
            <input type="hidden" name="dishId" value={dishId} />
            <input type="hidden" name="qty" value={qty + 1} />
            <button
              type="submit"
              disabled={busy || qty >= MAX_QUANTITY}
              aria-label={t('oneMore')}
              className={buttonClasses('secondary', 'min-w-12 px-0 text-xl')}
            >
              +
            </button>
          </form>
        </div>
      )}
      {qty >= MAX_QUANTITY ? <p className="text-sm text-muted">{t('maxReached', { max: MAX_QUANTITY })}</p> : null}
      {askReplace ? (
        <div role="alertdialog" aria-labelledby={`replace-${dishId}`} className="flex w-64 flex-col gap-2 rounded-xl border border-warn bg-amber-50 p-3">
          <p id={`replace-${dishId}`} className="text-sm font-semibold">
            {t('replaceQuestion')}
          </p>
          <form action={addAction}>
            <input type="hidden" name="dishId" value={dishId} />
            <input type="hidden" name="replace" value="true" />
            <button type="submit" disabled={busy} className={buttonClasses('primary', 'w-full')}>
              {t('replaceConfirm')}
            </button>
          </form>
          <button type="button" onClick={() => setDismissed(addState)} className={buttonClasses('secondary', 'w-full')}>
            {t('replaceKeep')}
          </button>
        </div>
      ) : null}
      {errorText ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {errorText}
        </p>
      ) : null}
    </div>
  );
}
