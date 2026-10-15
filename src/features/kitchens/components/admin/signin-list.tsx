'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { formatPhone } from '@/shared/i18n/format';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { TextField } from '@/shared/ui/field';
import { FormError } from '@/shared/ui/form-message';
import { useErrorText } from '@/shared/ui/use-error-text';
import { addSigninAction, removeSigninAction, type AdminFormState } from '../../actions/admin';

/** The kitchen's sign-in list (FR-053): add helpers; remove any number but the last. */
export function SigninList({ kitchenId, signins }: { kitchenId: string; signins: { id: string; phone: string; personName: string }[] }) {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const [addState, addAction, adding] = useActionState<AdminFormState, FormData>(addSigninAction, {});
  const [removeState, removeAction, removing] = useActionState<AdminFormState, FormData>(removeSigninAction, {});
  const addErrors = useErrorText(addState.error);
  const removeErrors = useErrorText(removeState.error);
  return (
    <Card className="flex flex-col gap-3" data-testid="signin-list">
      <h2 className="text-lg font-bold">{t('signinsTitle')}</h2>
      <p className="text-sm text-muted">{t('signinsHelp')}</p>
      <ul className="flex flex-col gap-2">
        {signins.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2" data-phone={s.phone}>
            <span>
              <span className="font-semibold">{formatPhone(s.phone)}</span>
              <span className="ms-2 text-muted">{s.personName}</span>
            </span>
            <form action={removeAction}>
              <input type="hidden" name="kitchenId" value={kitchenId} />
              <input type="hidden" name="signinId" value={s.id} />
              <Button type="submit" variant="ghost" disabled={removing} aria-label={t('signinRemove', { phone: formatPhone(s.phone) })}>
                {tc('remove')}
              </Button>
            </form>
          </li>
        ))}
      </ul>
      <FormError message={removeErrors.form} />
      <form action={addAction} key={addState.saved ? 'saved' : JSON.stringify(addState.values ?? {})} className="grid gap-2 md:grid-cols-2">
        <input type="hidden" name="kitchenId" value={kitchenId} />
        <TextField name="phone" type="tel" inputMode="numeric" label={t('signinNewPhone')} defaultValue={addState.values?.phone} error={addErrors.field('phone')} />
        <TextField name="personName" label={t('signinNewName')} maxLength={60} defaultValue={addState.values?.personName} error={addErrors.field('personName')} />
        <Button type="submit" variant="secondary" disabled={adding} className="self-start md:col-span-2">
          {t('signinAdd')}
        </Button>
        <div className="md:col-span-2">
          <FormError message={addErrors.form} />
        </div>
      </form>
    </Card>
  );
}
