import { isFinal, type OrderStatus } from './lifecycle';

/** The admin dispatch board's columns, in order (FR-033). */
export const DISPATCH_GROUPS = ['waiting_kitchen', 'needs_agent', 'assigned', 'out_for_delivery', 'finished'] as const;
export type DispatchGroup = (typeof DISPATCH_GROUPS)[number];

export function dispatchGroup(order: { status: OrderStatus; agentId: string | null }): DispatchGroup {
  if (isFinal(order.status)) return 'finished';
  if (order.status === 'placed') return 'waiting_kitchen';
  if (order.status === 'picked_up') return 'out_for_delivery';
  return order.agentId ? 'assigned' : 'needs_agent';
}
