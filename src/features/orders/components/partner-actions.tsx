'use client';

import { ArrowLeft, Bike, Check, ChefHat, CircleX, PackageCheck, X } from 'lucide-react';
import { useActionState, useState, type ReactNode } from 'react';
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

  const step = (name: 'accept' | 'preparing' | 'ready', label: string, icon: ReactNode, className = 'w-full') => (
    <form action={stepAction} onSubmit={() => acknowledge(orderId)} className={className}>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="step" value={name} />
      <button type="submit" disabled={busy} className={buttonClasses(name === 'accept' ? 'primary' : 'tonal', 'w-full', 'compact')}>
        {icon}
        {label}
      </button>
    </form>
  );

  return (
    <div className="flex flex-col gap-2">
      {status === 'placed' ? (
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <button type="button" onClick={() => setRejectOpen(true)} className={buttonClasses('secondary', 'text-danger')}>
            <X aria-hidden="true" />
            {t('partnerOrders.reject')}
          </button>
          {step('accept', t('partnerOrders.accept'), <Check aria-hidden="true" />)}
        </div>
      ) : null}
      {status === 'accepted' ? step('preparing', t('partnerOrders.startPreparing'), <ChefHat aria-hidden="true" />) : null}
      {status === 'preparing' ? step('ready', t('partnerOrders.markReady'), <PackageCheck aria-hidden="true" />) : null}
      {status === 'ready' ? (
        <p className="inline-flex items-center gap-2 text-base font-semibold text-open">
          <Bike aria-hidden="true" className="size-5" />
          {t('partnerOrders.waitingPickup')}
        </p>
      ) : null}
      <FormError message={stepErrors.form} />

      {status === 'placed' && rejectOpen ? (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center">
          {/* The backdrop fades in on its own layer, below the sheet, which stays opaque (owner finding 4). */}
          <div aria-hidden="true" className="absolute inset-0 animate-fade-in bg-scrim" onClick={() => setRejectOpen(false)} />
          <form
            action={rejectAction}
            onSubmit={() => acknowledge(orderId)}
            data-testid="reject-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`reject-${orderId}`}
            className="relative flex w-full max-w-md animate-sheet-up flex-col gap-3 rounded-t-xl bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-3"
          >
            <input type="hidden" name="orderId" value={orderId} />
            <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-line-strong/50" />
            <fieldset className="flex flex-col gap-2">
              <legend id={`reject-${orderId}`} className="mb-1 text-heading font-bold">
                {t('partnerOrders.rejectReason')}
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {PARTNER_REASONS.map((r) => (
                  <label
                    key={r}
                    className="flex min-h-touch cursor-pointer items-center gap-2 rounded-md border border-line-strong/45 px-3 py-2 text-small font-semibold has-[:checked]:border-danger has-[:checked]:bg-danger-soft has-[:checked]:text-danger"
                  >
                    <input type="radio" name="reason" value={r} onChange={() => setReason(r)} className="size-4 shrink-0 accent-danger" />
                    <span>{t(`orderReason.${r}`)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {reason === 'other' ? (
              <TextAreaField name="note" label={t('partnerOrders.rejectNote')} maxLength={200} required error={rejectErrors.field('note')} />
            ) : null}
            <FormError message={rejectErrors.form ?? rejectErrors.field('reason')} />
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <button type="button" onClick={() => setRejectOpen(false)} className={buttonClasses('secondary')}>
                <ArrowLeft aria-hidden="true" />
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={busy || !reason} className={buttonClasses('danger', 'w-full')}>
                <CircleX aria-hidden="true" />
                {t('partnerOrders.confirmReject')}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
