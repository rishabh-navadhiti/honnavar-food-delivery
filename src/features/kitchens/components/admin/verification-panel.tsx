'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { TextField } from '@/shared/ui/field';
import { FormError } from '@/shared/ui/form-message';
import { useErrorText } from '@/shared/ui/use-error-text';
import { recordVerificationAction, type AdminFormState } from '../../actions/admin';

/**
 * Record an FSSAI licence or hygiene-check reference (FR-021). The kind follows the kitchen type.
 * STAND-IN: the label makes clear nothing is checked with FSSAI.
 */
export function VerificationPanel({
  kitchenId,
  kind,
  recorded,
}: {
  kitchenId: string;
  kind: 'fssai_licence' | 'hygiene_check';
  recorded: { reference: string; when: string } | null;
}) {
  const t = useTranslations('admin');
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(recordVerificationAction, {});
  const errors = useErrorText(state.error);
  return (
    <Card className="flex flex-col gap-3" data-testid="verification-panel">
      <h2 className="text-lg font-bold">{t('verificationTitle')}</h2>
      {recorded ? (
        <div>
          <p className="text-base font-semibold">{t('verifiedOn', recorded)}</p>
          <p className="text-sm text-warn">{t('standInLabel')}</p>
        </div>
      ) : (
        <p className="text-base text-muted">{t('notVerified')}</p>
      )}
      <form action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="kitchenId" value={kitchenId} />
        <input type="hidden" name="kind" value={kind} />
        <TextField
          name="reference"
          label={kind === 'fssai_licence' ? t('kindFssai') : t('kindHygiene')}
          inputMode={kind === 'fssai_licence' ? 'numeric' : 'text'}
          maxLength={40}
          defaultValue={state.values?.reference}
          error={errors.field('reference')}
        />
        <Button type="submit" variant="secondary" disabled={pending} className="self-start">
          {t('recordVerification')}
        </Button>
        <FormError message={errors.form} />
      </form>
    </Card>
  );
}
