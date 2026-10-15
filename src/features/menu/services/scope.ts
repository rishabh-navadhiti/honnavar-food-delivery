import 'server-only';
import { resolveKitchenScope, type Actor } from '../../auth/actor-scope';

export function stampFor(actor: Actor, now: Date = new Date()) {
  return { updatedByRole: actor.role, updatedByPhone: actor.phone, updatedAt: now };
}

export { resolveKitchenScope };
