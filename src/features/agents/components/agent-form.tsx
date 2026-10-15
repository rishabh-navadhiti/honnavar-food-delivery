'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/ui/button';
import { SelectField, TextField } from '@/shared/ui/field';
import { FormError } from '@/shared/ui/form-message';
import { useErrorText } from '@/shared/ui/use-error-text';
import { saveAgentAction, type AgentFormState } from '../actions';

type Agent = { id: string; name: string; phone: string; vehicleType: 'bicycle' | 'two_wheeler' | 'other'; vehicleReg: string | null };

/** Register or edit a delivery agent (FR-026). Keeps entered values after a failed save (FR-048). */
export function AgentForm({ agent }: { agent?: Agent }) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState<AgentFormState, FormData>(saveAgentAction, {});
  const values = state.values ?? {
    name: agent?.name ?? '',
    phone: agent?.phone ?? '',
    vehicleType: agent?.vehicleType ?? 'two_wheeler',
    vehicleReg: agent?.vehicleReg ?? '',
  };
  const errors = useErrorText(state.error);
  return (
    <form action={formAction} key={JSON.stringify(values)} className="grid max-w-2xl gap-4 md:grid-cols-2" noValidate>
      {agent ? <input type="hidden" name="id" value={agent.id} /> : null}
      <TextField name="name" label={t('agentAdmin.name')} defaultValue={values.name} maxLength={60} error={errors.field('name')} />
      <TextField name="phone" type="tel" inputMode="numeric" label={t('agentAdmin.phone')} defaultValue={values.phone} error={errors.field('phone')} />
      <SelectField name="vehicleType" label={t('agentAdmin.vehicleType')} defaultValue={values.vehicleType} error={errors.field('vehicleType')}>
        {(['bicycle', 'two_wheeler', 'other'] as const).map((v) => (
          <option key={v} value={v}>
            {t(`vehicleType.${v}`)}
          </option>
        ))}
      </SelectField>
      <TextField name="vehicleReg" label={t('agentAdmin.vehicleReg')} hint={t('common.optional')} defaultValue={values.vehicleReg} maxLength={20} error={errors.field('vehicleReg')} />
      <div className="md:col-span-2">
        <FormError message={errors.form} />
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t('common.saving') : t('agentAdmin.save')}
      </Button>
    </form>
  );
}
