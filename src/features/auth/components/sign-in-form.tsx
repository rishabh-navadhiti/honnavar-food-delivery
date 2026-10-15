'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { formatPhone } from '@/shared/i18n/format';
import { Button } from '@/shared/ui/button';
import { formErrorKey } from '@/shared/ui/error-text';
import { TextField } from '@/shared/ui/field';
import { signInAction, type SignInState } from '../actions';
import { normalizePhone } from '../domain/phone';
import type { Surface } from '../surfaces';

/** Mobile number, then the one-time code (FR-003). Works as plain form posts without JavaScript. */
export function SignInForm({ surface, next }: { surface: Surface; next?: string }) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signInAction, { step: 'phone', phone: '' });
  const fieldError = (name: string) => {
    const key = state.error?.fieldErrors?.[name];
    return key ? t(`errors.${key}`) : undefined;
  };
  const formError =
    state.error && !state.error.fieldErrors ? t(`errors.${formErrorKey(state.error)}`) : undefined;
  const normalised = normalizePhone(state.phone);

  return (
    <div className="flex flex-col gap-4">
      {state.step === 'phone' ? (
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <input type="hidden" name="surface" value={surface} />
          <input type="hidden" name="step" value="phone" />
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <TextField
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            label={t('auth.phoneLabel')}
            hint={t('auth.phoneHint')}
            defaultValue={state.phone}
            error={fieldError('phone')}
            required
          />
          {formError ? (
            <p role="alert" className="text-base font-medium text-danger">
              {formError}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="w-full text-lg">
            {pending ? t('common.loading') : t('auth.getCode')}
          </Button>
        </form>
      ) : (
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <input type="hidden" name="surface" value={surface} />
          <input type="hidden" name="step" value="code" />
          <input type="hidden" name="phone" value={state.phone} />
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <p className="text-base">{t('auth.codeSentTo', { phone: formatPhone(normalised ?? state.phone) })}</p>
          <TextField
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            label={t('auth.codeLabel')}
            error={fieldError('code')}
            required
            autoFocus
          />
          {formError ? (
            <p role="alert" className="text-base font-medium text-danger">
              {formError}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="w-full text-lg">
            {pending ? t('common.loading') : t('auth.signIn')}
          </Button>
          <Button
            variant="ghost"
            type="submit"
            name="change"
            value="1"
            formNoValidate
            className="self-start"
          >
            {t('auth.changeNumber')}
          </Button>
        </form>
      )}
    </div>
  );
}
