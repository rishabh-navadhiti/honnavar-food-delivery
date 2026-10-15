import 'server-only';
import type { PartnerActor as Partner } from '@/features/auth/actor-scope';
import type { Result } from '@/shared/result';
import { parseInput } from '@/shared/validation';
import { orderIdSchema, rejectSchema } from '../schemas';
import { applyTransition, type TransitionOutcome } from './transition';

/** Partner order services (FR-030): scoped to the session's kitchen by `applyTransition`. */
async function step(actor: Partner, input: unknown, now: Date, type: 'accept' | 'preparing' | 'ready'): Promise<Result<TransitionOutcome>> {
  const parsed = parseInput(orderIdSchema, input);
  if (!parsed.ok) return parsed;
  return applyTransition({ orderId: parsed.data.orderId, action: { type }, actor, now });
}

export const acceptOrder = (actor: Partner, input: unknown, now: Date) => step(actor, input, now, 'accept');
export const markPreparing = (actor: Partner, input: unknown, now: Date) => step(actor, input, now, 'preparing');
export const markReady = (actor: Partner, input: unknown, now: Date) => step(actor, input, now, 'ready');

/** Reject with a reason from the partner list; "other" needs a note (FR-019). */
export async function rejectOrder(actor: Partner, input: unknown, now: Date): Promise<Result<TransitionOutcome>> {
  const parsed = parseInput(rejectSchema, input);
  if (!parsed.ok) return parsed;
  const { orderId, reason, note } = parsed.data;
  return applyTransition({ orderId, action: { type: 'reject' }, actor, now, reason, note });
}
