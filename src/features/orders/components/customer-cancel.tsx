'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/shared/ui/button';
import { FormError } from '@/shared/ui/form-message';
import { useErrorText } from '@/shared/ui/use-error-text';
import { cancelOrderByCustomerAction, type CancelState } from '../actions/customer';

/** "Cancel order" with a confirmation, while the kitchen has not accepted yet (FR-027). */
export function CustomerCancel({ orderId }: { orderId: string }) {
  const t = useTranslations('customerCancel');
  const [state, formAction, pending] = useActionState<CancelState, FormData>(cancelOrderByCustomerAction, {});
  const [confirming, setConfirming] = useState(false);
  const errors = useErrorText(state.error);
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={buttonClasses('secondary', 'w-full')}>
        {t('cancel')}
      </button>
    );
  }
  return (
    <form action={formAction} className="flex animate-fade-in flex-col gap-2 rounded-lg bg-danger-soft p-3">
      <input type="hidden" name="orderId" value={orderId} />
      <p className="text-base font-semibold">{t('question')}</p>
      <button type="submit" disabled={pending} className={buttonClasses('danger', 'w-full')}>
        {t('confirm')}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className={buttonClasses('ghost', 'w-full')}>
        {t('keep')}
      </button>
      <FormError message={errors.form} />
    </form>
  );
}
