import { err, ok, type Result } from '@/shared/result';

/** Who is making a change, for FR-055 stamping and kitchen scoping. Pure: safe in services. */
export type Actor =
  | { role: 'partner'; phone: string; signinId: string; kitchenId: string }
  | { role: 'admin'; phone: string; adminId: string };

/**
 * The kitchen an operation may touch. Partners are pinned to their session's kitchen and may not
 * name another (FR-030); admins must name the kitchen they are editing (FR-054).
 */
export function resolveKitchenScope(actor: Actor, inputKitchenId?: string | null): Result<string> {
  if (actor.role === 'partner') {
    if (inputKitchenId && inputKitchenId !== actor.kitchenId) return err('unauthorised');
    return ok(actor.kitchenId);
  }
  return inputKitchenId ? ok(inputKitchenId) : err('invalid');
}
