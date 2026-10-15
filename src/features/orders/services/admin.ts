import 'server-only';
import { z } from 'zod';
import type { Actor } from '@/features/auth/actor-scope';
import type { Result } from '@/shared/result';
import { fields, parseInput } from '@/shared/validation';
import { adminCancelSchema } from '../schemas';
import { applyTransition, type TransitionOutcome } from './transition';

const assignSchema = z.object({ orderId: fields.id(), agentId: fields.id() });

/** Assign or reassign an active agent (FR-034): from acceptance until pickup, by admins only. */
export async function assignAgent(actor: Actor, input: unknown, now: Date): Promise<Result<TransitionOutcome>> {
  const parsed = parseInput(assignSchema, input);
  if (!parsed.ok) return parsed;
  return applyTransition({ orderId: parsed.data.orderId, action: { type: 'assign', agentId: parsed.data.agentId }, actor, now });
}

/** Cancel any unfinished order with a reason from the admin list (FR-035, FR-019). */
export async function cancelOrderByAdmin(actor: Actor, input: unknown, now: Date): Promise<Result<TransitionOutcome>> {
  const parsed = parseInput(adminCancelSchema, input);
  if (!parsed.ok) return parsed;
  const { orderId, reason, note } = parsed.data;
  if (actor.role !== 'admin') return { ok: false, error: { code: 'unauthorised' } };
  return applyTransition({ orderId, action: { type: 'cancel' }, actor, now, reason, note });
}
