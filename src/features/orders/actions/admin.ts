'use server';

import { revalidatePath } from 'next/cache';
import { currentActor } from '@/features/auth/actor';
import { log } from '@/shared/log';
import type { ResultError } from '@/shared/result';
import { assignAgent, cancelOrderByAdmin } from '../services/admin';

export type AdminOrderState = { error?: ResultError; done?: boolean };

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
};

async function run(action: string, work: (actor: NonNullable<Awaited<ReturnType<typeof currentActor>>>) => Promise<{ ok: boolean; error?: ResultError }>): Promise<AdminOrderState> {
  const actor = await currentActor('admin');
  if (!actor) return { error: { code: 'unauthorised' } };
  try {
    const result = await work(actor);
    if (!result.ok) return { error: result.error };
  } catch (error) {
    log.error(`${action} failed`, { action, surface: 'admin', subjectId: actor.role === 'admin' ? actor.adminId : null, error });
    return { error: { code: 'unexpected' } };
  }
  revalidatePath('/admin/orders', 'layout');
  return { done: true };
}

/** Assign or reassign an agent (FR-034). */
export async function assignAgentAction(_previous: AdminOrderState, formData: FormData): Promise<AdminOrderState> {
  return run('assignAgentAction', (actor) =>
    assignAgent(actor, { orderId: text(formData, 'orderId'), agentId: text(formData, 'agentId') }, new Date()),
  );
}

/** Cancel with a reason (FR-035). */
export async function cancelOrderByAdminAction(_previous: AdminOrderState, formData: FormData): Promise<AdminOrderState> {
  return run('cancelOrderByAdminAction', (actor) =>
    cancelOrderByAdmin(
      actor,
      { orderId: text(formData, 'orderId'), reason: text(formData, 'reason') || undefined, note: text(formData, 'note') },
      new Date(),
    ),
  );
}
