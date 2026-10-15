'use client';

import { useActionState, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { isLocale } from '@/shared/i18n/config';
import { formatPrice } from '@/shared/i18n/format';
import { buttonClasses } from '@/shared/ui/button';
import { FormError } from '@/shared/ui/form-message';
import { useErrorText } from '@/shared/ui/use-error-text';
import { agentStepAction, type AgentActionState } from '../actions/agent';
import type { OrderStatus } from '../domain/lifecycle';

/**
 * "Picked up" once the kitchen marks the order Ready, then "Delivered"; a cash order first asks the
 * agent to confirm collecting the grand total (FR-042, FR-043).
 */
export function AgentSteps({ orderId, status, paymentMethod, grandTotal }: { orderId: string; status: OrderStatus; paymentMethod: 'cod' | 'upi_demo'; grandTotal: number }) {
  const t = useTranslations('agentOrder');
  const current = useLocale();
  const [state, formAction, pending] = useActionState<AgentActionState, FormData>(agentStepAction, {});
  const [confirming, setConfirming] = useState(false);
  const errors = useErrorText(state.error);
  const amount = formatPrice(grandTotal, isLocale(current) ? current : 'en');

  return (
    <div className="flex flex-col gap-2">
      {status === 'accepted' || status === 'preparing' ? (
        <p className="rounded-xl bg-secondary p-3 text-base font-semibold" data-testid="still-preparing">
          {t('stillPreparing')}
        </p>
      ) : null}
      {status === 'ready' ? (
        <form action={formAction}>
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="step" value="pickup" />
          <button type="submit" disabled={pending} className={buttonClasses('primary', 'w-full text-lg')}>
            {t('pickedUp')}
          </button>
        </form>
      ) : null}
      {status === 'picked_up' ? (
        paymentMethod === 'cod' && !confirming ? (
          <button type="button" onClick={() => setConfirming(true)} className={buttonClasses('primary', 'w-full text-lg')}>
            {t('delivered')}
          </button>
        ) : (
          <form action={formAction} className="flex flex-col gap-2">
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="step" value="deliver" />
            {paymentMethod === 'cod' ? (
              <>
                <input type="hidden" name="cashCollected" value="true" />
                <p className="text-base font-semibold">{t('confirmCashQuestion')}</p>
                <button type="submit" disabled={pending} className={buttonClasses('primary', 'w-full text-lg')}>
                  {t('confirmCash', { amount })}
                </button>
                <button type="button" onClick={() => setConfirming(false)} className={buttonClasses('ghost', 'w-full')}>
                  {t('notYet')}
                </button>
              </>
            ) : (
              <button type="submit" disabled={pending} className={buttonClasses('primary', 'w-full text-lg')}>
                {t('delivered')}
              </button>
            )}
          </form>
        )
      ) : null}
      {status === 'delivered' ? <p className="text-base font-semibold text-open">{t('deliveredDone')}</p> : null}
      <FormError message={errors.form} />
    </div>
  );
}
