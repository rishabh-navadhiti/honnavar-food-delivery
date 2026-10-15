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

/** Switch an agent active or inactive. A refusal (002 FR-036) is shown on the agents list. */
export async function setAgentActiveAction(formData: FormData): Promise<void> {
  const actor = await currentActor('admin');
  if (!actor) return;
  const id = formText(formData, 'id');
  let refusedOrders: string | null = null;
  try {
    const result = await setAgentActive(actor, { id, active: formText(formData, 'active') === 'true' });
    if (!result.ok && result.error.code === 'agent_has_orders') refusedOrders = String(result.error.details?.orderNos ?? '');
  } catch (error) {
    log.error('setAgentActiveAction failed', { action: 'setAgentActiveAction', surface: 'admin', error });
  }
  revalidatePath('/admin/agents');
  if (refusedOrders !== null) redirect(`/admin/agents?${new URLSearchParams({ refused: id, orders: refusedOrders })}`);
}
