import { err, ok, type Result } from '@/shared/result';

/** Who is making a change, for FR-055 stamping and kitchen scoping. Pure: safe in services. */
export type Actor =
  | { role: 'partner'; phone: string; signinId: string; kitchenId: string }
  | { role: 'admin'; phone: string; adminId: string };

/** A signed-in customer (002): orders, addresses and cancellation of their own Placed orders. */
export type CustomerActor = { role: 'customer'; customerId: string; phone: string };
/** A signed-in delivery agent (002): pickup and delivery of orders assigned to them now. */
export type AgentActor = { role: 'agent'; agentId: string; phone: string };
/** Anyone who can change an order. */
export type OrderActor = Actor | CustomerActor | AgentActor;

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
