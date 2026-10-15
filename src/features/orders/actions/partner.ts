'use server';

import { revalidatePath } from 'next/cache';
import { currentActor } from '@/features/auth/actor';
import { log } from '@/shared/log';
import type { ResultError } from '@/shared/result';
import { acceptOrder, markPreparing, markReady, rejectOrder } from '../services/partner';

export type PartnerActionState = { error?: ResultError; done?: boolean };

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
};

const STEPS = { accept: acceptOrder, preparing: markPreparing, ready: markReady } as const;

/** Accept, Preparing or Ready on one of the partner's orders (FR-030). */
export async function partnerStepAction(_previous: PartnerActionState, formData: FormData): Promise<PartnerActionState> {
  const actor = await currentActor('partner');
  if (!actor || actor.role !== 'partner') return { error: { code: 'unauthorised' } };
  const step = text(formData, 'step') as keyof typeof STEPS;
  if (!(step in STEPS)) return { error: { code: 'invalid' } };
  try {
    const result = await STEPS[step](actor, { orderId: text(formData, 'orderId') }, new Date());
    if (!result.ok) return { error: result.error };
  } catch (error) {
    log.error('partnerStepAction failed', { action: 'partnerStepAction', surface: 'partner', subjectId: actor.signinId, error });
    return { error: { code: 'unexpected' } };
  }
  revalidatePath('/partner', 'layout');
  return { done: true };
}

/** Reject with a reason (FR-019). */
export async function rejectOrderAction(_previous: PartnerActionState, formData: FormData): Promise<PartnerActionState> {
  const actor = await currentActor('partner');
  if (!actor || actor.role !== 'partner') return { error: { code: 'unauthorised' } };
  try {
    const result = await rejectOrder(
      actor,
      { orderId: text(formData, 'orderId'), reason: text(formData, 'reason') || undefined, note: text(formData, 'note') },
      new Date(),
    );
    if (!result.ok) return { error: result.error };
  } catch (error) {
    log.error('rejectOrderAction failed', { action: 'rejectOrderAction', surface: 'partner', subjectId: actor.signinId, error });
    return { error: { code: 'unexpected' } };
  }
  revalidatePath('/partner', 'layout');
  return { done: true };
}
