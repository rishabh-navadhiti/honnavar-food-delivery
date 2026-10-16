'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/shared/ui/button';
import { TextAreaField } from '@/shared/ui/field';
import { FormError } from '@/shared/ui/form-message';
import { useErrorText } from '@/shared/ui/use-error-text';
import { cancelOrderByAdminAction, type AdminOrderState } from '../actions/admin';
import { ADMIN_REASONS } from '../schemas';

/** Cancel an unfinished order with a reason; "other" needs a note (FR-035, FR-019). */
export function AdminCancelForm({ orderId }: { orderId: string }) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState<AdminOrderState, FormData>(cancelOrderByAdminAction, {});
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const errors = useErrorText(state.error);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonClasses('danger', 'self-start')}>
        {t('adminOrder.cancel')}
      </button>
    );
  }
  return (
    <form action={formAction} className="flex max-w-md flex-col gap-3 rounded-md border border-line p-3" data-testid="cancel-form">
      <input type="hidden" name="orderId" value={orderId} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-base font-bold">{t('adminOrder.cancelReason')}</legend>
        {ADMIN_REASONS.map((r) => (
          <label key={r} className="flex min-h-touch cursor-pointer items-center gap-3 rounded-md border border-line px-3 has-[:checked]:border-primary">
            <input type="radio" name="reason" value={r} onChange={() => setReason(r)} className="size-5 accent-primary" />
            <span>{t(`orderReason.${r}`)}</span>
          </label>
        ))}
      </fieldset>
      {reason === 'other' ? <TextAreaField name="note" label={t('adminOrder.cancelNote')} maxLength={200} required error={errors.field('note')} /> : null}
      <FormError message={errors.form ?? errors.field('reason')} />
      <button type="submit" disabled={pending || !reason} className={buttonClasses('danger')}>
        {t('adminOrder.confirmCancel')}
      </button>
      <button type="button" onClick={() => setOpen(false)} className={buttonClasses('ghost')}>
        {t('common.back')}
      </button>
    </form>
  );
}
