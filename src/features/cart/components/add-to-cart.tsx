'use client';

import { Minus, Plus } from 'lucide-react';
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
    <div className="relative flex flex-col items-end gap-2">
      {qty === 0 ? (
        <form action={addAction}>
          <input type="hidden" name="dishId" value={dishId} />
          <button type="submit" disabled={busy} className={buttonClasses('secondary', 'min-w-24 border-primary/30 text-primary-strong shadow-2')}>
            {t('add')}
            <Plus aria-hidden="true" />
          </button>
        </form>
      ) : (
        <div className="flex h-12 items-center rounded-md bg-primary text-on-primary shadow-2" role="group" aria-label={t('quantity')}>
          <form action={qtyAction}>
            <input type="hidden" name="dishId" value={dishId} />
            <input type="hidden" name="qty" value={qty - 1} />
            <button type="submit" disabled={busy} aria-label={t('oneLess')} className="grid size-12 place-items-center rounded-md active:scale-95 disabled:opacity-50">
              <Minus aria-hidden="true" className="size-5" />
            </button>
          </form>
          <span className="min-w-6 text-center text-heading font-bold" aria-live="polite" data-testid="cart-qty">
            {qty}
          </span>
          <form action={qtyAction}>
            <input type="hidden" name="dishId" value={dishId} />
            <input type="hidden" name="qty" value={qty + 1} />
            <button
              type="submit"
              disabled={busy || qty >= MAX_QUANTITY}
              aria-label={t('oneMore')}
              className="grid size-12 place-items-center rounded-md active:scale-95 disabled:opacity-50"
            >
              <Plus aria-hidden="true" className="size-5" />
            </button>
          </form>
        </div>
      )}
      {qty >= MAX_QUANTITY ? <p className="text-small text-muted">{t('maxReached', { max: MAX_QUANTITY })}</p> : null}
      {askReplace ? (
        <div role="alertdialog" aria-labelledby={`replace-${dishId}`} className="absolute end-0 top-full z-10 mt-2 flex w-64 animate-fade-in flex-col gap-2 rounded-lg bg-warn-soft p-3 shadow-3">
          <p id={`replace-${dishId}`} className="text-small font-semibold">
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
        <p role="alert" className="text-small font-semibold text-danger">
          {errorText}
        </p>
      ) : null}
    </div>
  );
}
