import type { OrderEventKind } from '@/features/orders/domain/lifecycle';
import type { MessageKind, Notification } from '@/shared/adapters/notifications/types';
import type { MessageParams } from '@/shared/db/schema/messages';

/** The order as it was when the change happened (`agentId` = who held it before the change). */
export type MessageOrder = {
  id: string;
  orderNo: number;
  customerId: string;
  kitchenId: string;
  grandTotal: number;
  agentId: string | null;
};

export type MessageEvent = {
  kind: OrderEventKind;
  agentId?: string | null;
  previousAgentId?: string | null;
  reason?: string | null;
  reasonNote?: string | null;
};

/**
 * Who would get an SMS or WhatsApp update for this change, and which one (FR-046; data-model.md
 * "Messages per change"). Pure: shared by live orders and the demo seed.
 */
export function messagesFor(event: MessageEvent, order: MessageOrder): Notification[] {
  const base: MessageParams = { orderNo: order.orderNo };
  const reasonParams = {
    ...base,
    ...(event.reason ? { reason: event.reason } : {}),
    ...(event.reasonNote ? { reasonNote: event.reasonNote } : {}),
  };
  const toCustomer = (kind: MessageKind, params: MessageParams = base): Notification => ({
    recipient: { kind: 'customer', customerId: order.customerId },
    orderId: order.id,
    kind,
    params,
  });
  const toKitchen = (kind: MessageKind, params: MessageParams = base): Notification => ({
    recipient: { kind: 'kitchen', kitchenId: order.kitchenId },
    orderId: order.id,
    kind,
    params,
  });
  const toAgent = (agentId: string, kind: MessageKind, params: MessageParams = base): Notification => ({
    recipient: { kind: 'agent', agentId },
    orderId: order.id,
    kind,
    params,
  });
  const withAmount = { ...base, amount: order.grandTotal };

  switch (event.kind) {
    case 'placed':
      return [toCustomer('order_placed', withAmount), toKitchen('kitchen_new_order', withAmount)];
    case 'accepted':
      return [toCustomer('order_accepted')];
    case 'rejected':
      return [toCustomer('order_rejected', reasonParams)];
    case 'preparing':
      return [toCustomer('order_preparing')];
    case 'ready':
      return [];
    case 'assigned':
    case 'reassigned': {
      const agentId = event.agentId!;
      const list = [
        toKitchen('kitchen_agent_assigned', { ...base, agentId }),
        toAgent(agentId, 'agent_assigned', withAmount),
      ];
      if (event.kind === 'reassigned' && event.previousAgentId) {
        list.push(toAgent(event.previousAgentId, 'agent_unassigned'));
      }
      return list;
    }
    case 'picked_up':
      return [toCustomer('order_picked_up')];
    case 'delivered':
      return [toCustomer('order_delivered', withAmount)];
    case 'cancelled': {
      const list = [toCustomer('order_cancelled', reasonParams), toKitchen('kitchen_order_cancelled', reasonParams)];
      if (order.agentId) list.push(toAgent(order.agentId, 'agent_order_cancelled', reasonParams));
      return list;
    }
  }
}
