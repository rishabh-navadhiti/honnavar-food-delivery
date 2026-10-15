'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/shared/ui/button';
import { FormError } from '@/shared/ui/form-message';
import { useErrorText } from '@/shared/ui/use-error-text';
import { reorderAction, type ReorderState } from '../actions/customer';

/** Optional (FR-052): order the same again; asks before replacing another kitchen's cart. */
export function ReorderButton({ orderId }: { orderId: string }) {
  const t = useTranslations('reorder');
  const [state, formAction, pending] = useActionState<ReorderState, FormData>(reorderAction, {});
  const askReplace = state.error?.code === 'other_kitchen';
  const errors = useErrorText(askReplace ? undefined : state.error);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      {askReplace ? (
        <>
          <input type="hidden" name="replace" value="true" />
          <p className="text-sm font-semibold">{t('replaceQuestion')}</p>
          <button type="submit" disabled={pending} className={buttonClasses('primary')}>
            {t('replaceConfirm')}
          </button>
        </>
      ) : (
        <button type="submit" disabled={pending} className={buttonClasses('secondary')}>
          {t('button')}
        </button>
      )}
      <FormError message={errors.form} />
    </form>
  );
}
