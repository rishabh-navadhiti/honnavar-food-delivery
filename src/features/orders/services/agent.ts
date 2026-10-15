import 'server-only';
import { z } from 'zod';
import type { AgentActor } from '@/features/auth/actor-scope';
import type { Result } from '@/shared/result';
import { fields, parseInput } from '@/shared/validation';
import { orderIdSchema } from '../schemas';
import { applyTransition, type TransitionOutcome } from './transition';

/** Pick up a Ready order assigned to this agent now (FR-042). */
export async function markPickedUp(actor: AgentActor, input: unknown, now: Date): Promise<Result<TransitionOutcome>> {
  const parsed = parseInput(orderIdSchema, input);
  if (!parsed.ok) return parsed;
  return applyTransition({ orderId: parsed.data.orderId, action: { type: 'pickup' }, actor, now });
}

const deliverSchema = z.object({
  orderId: fields.id(),
  cashCollected: z.preprocess((v) => v === 'true' || v === true, z.boolean()).optional(),
});

/** Deliver; a cash order needs the agent to confirm collecting the grand total (FR-043). */
export async function markDelivered(actor: AgentActor, input: unknown, now: Date): Promise<Result<TransitionOutcome>> {
  const parsed = parseInput(deliverSchema, input);
  if (!parsed.ok) return parsed;
  return applyTransition({
    orderId: parsed.data.orderId,
    action: { type: 'deliver', cashConfirmed: parsed.data.cashCollected ?? false },
    actor,
    now,
  });
}
