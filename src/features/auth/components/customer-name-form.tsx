'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/ui/button';
import { TextField } from '@/shared/ui/field';
import { updateCustomerNameAction, type NameState } from '../actions';

export function CustomerNameForm({ displayName }: { displayName: string }) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState<NameState, FormData>(updateCustomerNameAction, {});
  const fieldKey = state.error?.fieldErrors?.displayName;
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <TextField
        name="displayName"
        label={t('account.displayName')}
        hint={t('account.displayNameHint')}
        defaultValue={displayName}
        maxLength={60}
        autoComplete="name"
        error={fieldKey ? t(`errors.${fieldKey}`) : undefined}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? t('common.saving') : t('account.saveName')}
        </Button>
        {state.saved ? (
          <span role="status" className="text-base text-open">
            {t('account.nameSaved')}
          </span>
        ) : null}
      </div>
    </form>
  );
}
