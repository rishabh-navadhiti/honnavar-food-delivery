'use server';

import { revalidatePath } from 'next/cache';
import { currentAgent } from '@/features/auth/actor';
import { log } from '@/shared/log';
import type { ResultError } from '@/shared/result';
import { markDelivered, markPickedUp } from '../services/agent';

export type AgentActionState = { error?: ResultError; done?: boolean };

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
};

/** Picked up, or Delivered with the cash confirmation for cash orders (FR-042, FR-043). */
export async function agentStepAction(_previous: AgentActionState, formData: FormData): Promise<AgentActionState> {
  const actor = await currentAgent();
  if (!actor) return { error: { code: 'unauthorised' } };
  const orderId = text(formData, 'orderId');
  try {
    const result =
      text(formData, 'step') === 'pickup'
        ? await markPickedUp(actor, { orderId }, new Date())
        : await markDelivered(actor, { orderId, cashCollected: text(formData, 'cashCollected') }, new Date());
    if (!result.ok) return { error: result.error };
  } catch (error) {
    log.error('agentStepAction failed', { action: 'agentStepAction', surface: 'agent', subjectId: actor.agentId, error });
    return { error: { code: 'unexpected' } };
  }
  revalidatePath('/agent', 'layout');
  return { done: true };
}
