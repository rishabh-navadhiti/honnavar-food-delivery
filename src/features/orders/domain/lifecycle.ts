/**
 * The order state machine (FR-016, FR-017; data-model.md "Order lifecycle"). Pure and test-first.
 * Agent assignment is recorded alongside the status, not as a status.
 */

export type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'rejected'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'delivered'
  | 'cancelled';

export type OrderEventKind =
  | 'placed'
  | 'accepted'
  | 'rejected'
  | 'preparing'
  | 'ready'
  | 'assigned'
  | 'reassigned'
  | 'picked_up'
  | 'delivered'
  | 'cancelled';

export type OrderState = { status: OrderStatus; agentId: string | null; paymentMethod: 'cod' | 'upi_demo' };

export type OrderAction =
  | { type: 'accept' }
  | { type: 'reject' }
  | { type: 'expire' }
  | { type: 'preparing' }
  | { type: 'ready' }
  | { type: 'assign'; agentId: string; agentActive: boolean }
  | { type: 'pickup' }
  | { type: 'deliver'; cashConfirmed?: boolean }
  | { type: 'cancel' };

export type LifecycleActor =
  | { role: 'customer' | 'partner' | 'admin' | 'system' }
  | { role: 'agent'; agentId: string };

export type NextState = {
  status: OrderStatus;
  agentId: string | null;
  event: OrderEventKind;
  /** Set for assignments: the agent who held the order before (null on a first assignment). */
  previousAgentId?: string | null;
};

export type TransitionCode =
  | 'unauthorised'
  | 'order_moved_on'
  | 'not_assignable'
  | 'agent_inactive'
  | 'same_agent'
  | 'not_ready'
  | 'not_found'
  | 'cash_not_confirmed';

export type TransitionResult = { ok: true; next: NextState } | { ok: false; code: TransitionCode };

const FINAL: ReadonlySet<OrderStatus> = new Set(['delivered', 'rejected', 'cancelled']);
const ASSIGNABLE: ReadonlySet<OrderStatus> = new Set(['accepted', 'preparing', 'ready']);

export function isFinal(status: OrderStatus): boolean {
  return FINAL.has(status);
}

const refuse = (code: TransitionCode): TransitionResult => ({ ok: false, code });
const move = (order: OrderState, status: OrderStatus, event: OrderEventKind): TransitionResult => ({
  ok: true,
  next: { status, agentId: order.agentId, event },
});

/** A kitchen step: only the partner, and only from the one status it follows. */
function kitchenStep(order: OrderState, actor: LifecycleActor, from: OrderStatus, to: OrderStatus): TransitionResult {
  if (actor.role !== 'partner') return refuse('unauthorised');
  return order.status === from ? move(order, to, to as OrderEventKind) : refuse('order_moved_on');
}

export function canTransition(order: OrderState, action: OrderAction, actor: LifecycleActor): TransitionResult {
  switch (action.type) {
    case 'accept':
      return kitchenStep(order, actor, 'placed', 'accepted');
    case 'reject':
      return kitchenStep(order, actor, 'placed', 'rejected');
    case 'preparing':
      return kitchenStep(order, actor, 'accepted', 'preparing');
    case 'ready':
      return kitchenStep(order, actor, 'preparing', 'ready');

    case 'expire':
      if (actor.role !== 'system') return refuse('unauthorised');
      return order.status === 'placed' ? move(order, 'rejected', 'rejected') : refuse('order_moved_on');

    case 'assign': {
      if (actor.role !== 'admin') return refuse('unauthorised');
      if (!ASSIGNABLE.has(order.status)) return refuse('not_assignable');
      if (!action.agentActive) return refuse('agent_inactive');
      if (order.agentId === action.agentId) return refuse('same_agent');
      return {
        ok: true,
        next: {
          status: order.status,
          agentId: action.agentId,
          event: order.agentId ? 'reassigned' : 'assigned',
          previousAgentId: order.agentId,
        },
      };
    }

    case 'pickup':
      if (actor.role !== 'agent') return refuse('unauthorised');
      if (order.agentId !== actor.agentId) return refuse('not_found');
      if (order.status === 'ready') return move(order, 'picked_up', 'picked_up');
      return order.status === 'accepted' || order.status === 'preparing' ? refuse('not_ready') : refuse('order_moved_on');

    case 'deliver':
      if (actor.role !== 'agent') return refuse('unauthorised');
      if (order.agentId !== actor.agentId) return refuse('not_found');
      if (order.status !== 'picked_up') return refuse('order_moved_on');
      if (order.paymentMethod === 'cod' && !action.cashConfirmed) return refuse('cash_not_confirmed');
      return move(order, 'delivered', 'delivered');

    case 'cancel':
      if (actor.role === 'customer') {
        return order.status === 'placed' ? move(order, 'cancelled', 'cancelled') : refuse('order_moved_on');
      }
      if (actor.role === 'admin') {
        return isFinal(order.status) ? refuse('order_moved_on') : move(order, 'cancelled', 'cancelled');
      }
      return refuse('unauthorised');
  }
}
