import 'server-only';
import type { CustomerActor } from '@/features/auth/actor-scope';
import type { Result } from '@/shared/result';
import { parseInput } from '@/shared/validation';
import { orderIdSchema } from '../schemas';
import { applyTransition, type TransitionOutcome } from './transition';

/** A customer cancels their own order while it is still Placed; no reason is asked (FR-027). */
export async function cancelOrderByCustomer(actor: CustomerActor, input: unknown, now: Date): Promise<Result<TransitionOutcome>> {
  const parsed = parseInput(orderIdSchema, input);
  if (!parsed.ok) return parsed;
  return applyTransition({ orderId: parsed.data.orderId, action: { type: 'cancel' }, actor, now });
}
