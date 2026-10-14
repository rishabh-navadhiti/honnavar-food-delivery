'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { formOptionalId, formText, formValues } from '@/shared/forms';
import { log } from '@/shared/log';
import type { ResultError } from '@/shared/result';
import { currentActor } from '../auth/actor';
import { saveAgent, setAgentActive } from './services/agents';

export type AgentFormState = { values?: Record<string, string>; error?: ResultError };

export async function saveAgentAction(_previous: AgentFormState, formData: FormData): Promise<AgentFormState> {
  const actor = await currentActor('admin');
  if (!actor) return { error: { code: 'unauthorised' } };
  let result;
  try {
    result = await saveAgent(actor, {
      id: formOptionalId(formData, 'id'),
      name: formText(formData, 'name'),
      phone: formText(formData, 'phone'),
      vehicleType: formText(formData, 'vehicleType') as 'bicycle' | 'two_wheeler' | 'other',
      vehicleReg: formText(formData, 'vehicleReg'),
    });
  } catch (error) {
    log.error('saveAgentAction failed', { action: 'saveAgentAction', surface: 'admin', error });
    return { values: formValues(formData), error: { code: 'unexpected' } };
  }
  if (!result.ok) return { values: formValues(formData), error: result.error };
  revalidatePath('/admin/agents');
  redirect('/admin/agents');
}

export async function setAgentActiveAction(formData: FormData): Promise<void> {
  const actor = await currentActor('admin');
  if (!actor) return;
  try {
    await setAgentActive(actor, { id: formText(formData, 'id'), active: formText(formData, 'active') === 'true' });
  } catch (error) {
    log.error('setAgentActiveAction failed', { action: 'setAgentActiveAction', surface: 'admin', error });
  }
  revalidatePath('/admin/agents');
}
