'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/shared/ui/button';
import { TextAreaField } from '@/shared/ui/field';
import { FormError } from '@/shared/ui/form-message';
import { useErrorText } from '@/shared/ui/use-error-text';
import { partnerStepAction, rejectOrderAction, type PartnerActionState } from '../actions/partner';
import type { OrderStatus } from '../domain/lifecycle';
import { PARTNER_REASONS } from '../schemas';
import { acknowledge } from './alert-storage';

/** Accept / Reject / Preparing / Ready for the order's current status (FR-030). */
export function PartnerActions({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const t = useTranslations();
  const [stepState, stepAction, stepping] = useActionState<PartnerActionState, FormData>(partnerStepAction, {});
  const [rejectState, rejectAction, rejecting] = useActionState<PartnerActionState, FormData>(rejectOrderAction, {});
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState<string>('');
  const stepErrors = useErrorText(stepState.error);
  const rejectErrors = useErrorText(rejectState.error);
  const busy = stepping || rejecting;

  const step = (name: 'accept' | 'preparing' | 'ready', label: string) => (
    <form action={stepAction} onSubmit={() => acknowledge(orderId)}>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="step" value={name} />
      <button type="submit" disabled={busy} className={buttonClasses('primary', 'w-full')}>
        {label}
      </button>
    </form>
  );

  return (
    <div className="flex flex-col gap-2">
      {status === 'placed' ? (
        <>
          {step('accept', t('partnerOrders.accept'))}
          {rejectOpen ? null : (
            <button type="button" onClick={() => setRejectOpen(true)} className={buttonClasses('secondary', 'w-full')}>
              {t('partnerOrders.reject')}
            </button>
          )}
        </>
      ) : null}
      {status === 'accepted' ? step('preparing', t('partnerOrders.startPreparing')) : null}
      {status === 'preparing' ? step('ready', t('partnerOrders.markReady')) : null}
      {status === 'ready' ? <p className="text-base font-semibold text-open">{t('partnerOrders.waitingPickup')}</p> : null}
      <FormError message={stepErrors.form} />

      {status === 'placed' && rejectOpen ? (
        <form action={rejectAction} onSubmit={() => acknowledge(orderId)} className="flex flex-col gap-3 rounded-xl border border-line p-3">
          <input type="hidden" name="orderId" value={orderId} />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-base font-bold">{t('partnerOrders.rejectReason')}</legend>
            {PARTNER_REASONS.map((r) => (
              <label
                key={r}
                className="flex min-h-touch cursor-pointer items-center gap-3 rounded-xl border border-line px-3 has-[:checked]:border-primary has-[:checked]:bg-orange-50"
              >
                <input type="radio" name="reason" value={r} onChange={() => setReason(r)} className="size-5 accent-primary" />
                <span className="text-base">{t(`orderReason.${r}`)}</span>
              </label>
            ))}
          </fieldset>
          {reason === 'other' ? (
            <TextAreaField name="note" label={t('partnerOrders.rejectNote')} maxLength={200} required error={rejectErrors.field('note')} />
          ) : null}
          <FormError message={rejectErrors.form ?? rejectErrors.field('reason')} />
          <button type="submit" disabled={busy || !reason} className={buttonClasses('danger', 'w-full')}>
            {t('partnerOrders.confirmReject')}
          </button>
          <button type="button" onClick={() => setRejectOpen(false)} className={buttonClasses('ghost', 'w-full')}>
            {t('common.cancel')}
          </button>
        </form>
      ) : null}
    </div>
  );
}
