import { describe, expect, it } from 'vitest';
import { messagesFor, type MessageOrder } from './messages-for';

const order: MessageOrder = {
  id: 'order-1',
  orderNo: 1042,
  customerId: 'customer-1',
  kitchenId: 'kitchen-1',
  grandTotal: 330,
  agentId: null,
};
const customer = { kind: 'customer', customerId: 'customer-1' } as const;
const kitchen = { kind: 'kitchen', kitchenId: 'kitchen-1' } as const;
const agent = (agentId: string) => ({ kind: 'agent', agentId }) as const;

const summary = (list: ReturnType<typeof messagesFor>) => list.map((m) => [m.recipient, m.kind]);

describe('messagesFor (FR-046, data-model "Messages per change")', () => {
  it('placed: customer confirmation and the kitchen new-order message, with the amount', () => {
    const list = messagesFor({ kind: 'placed' }, order);
    expect(summary(list)).toEqual([
      [customer, 'order_placed'],
      [kitchen, 'kitchen_new_order'],
    ]);
    expect(list[0]!.params).toEqual({ orderNo: 1042, amount: 330 });
    expect(list.every((m) => m.orderId === 'order-1')).toBe(true);
  });

  it('accepted, preparing, picked up and delivered go to the customer only', () => {
    expect(summary(messagesFor({ kind: 'accepted' }, order))).toEqual([[customer, 'order_accepted']]);
    expect(summary(messagesFor({ kind: 'preparing' }, order))).toEqual([[customer, 'order_preparing']]);
    expect(summary(messagesFor({ kind: 'picked_up' }, { ...order, agentId: 'a1' }))).toEqual([[customer, 'order_picked_up']]);
    const delivered = messagesFor({ kind: 'delivered' }, { ...order, agentId: 'a1' });
    expect(summary(delivered)).toEqual([[customer, 'order_delivered']]);
    expect(delivered[0]!.params.amount).toBe(330);
  });

  it('rejected tells the customer the reason and note', () => {
    const list = messagesFor({ kind: 'rejected', reason: 'other', reasonNote: 'Gas ran out' }, order);
    expect(summary(list)).toEqual([[customer, 'order_rejected']]);
    expect(list[0]!.params).toEqual({ orderNo: 1042, reason: 'other', reasonNote: 'Gas ran out' });
  });

  it('ready sends nothing', () => {
    expect(messagesFor({ kind: 'ready' }, order)).toEqual([]);
  });

  it('assigned tells the kitchen and the agent', () => {
    const list = messagesFor({ kind: 'assigned', agentId: 'a1' }, order);
    expect(summary(list)).toEqual([
      [kitchen, 'kitchen_agent_assigned'],
      [agent('a1'), 'agent_assigned'],
    ]);
    expect(list[0]!.params.agentId).toBe('a1');
  });

  it('reassigned tells the kitchen, the new agent, and the previous agent it was taken away', () => {
    expect(summary(messagesFor({ kind: 'reassigned', agentId: 'a2', previousAgentId: 'a1' }, { ...order, agentId: 'a1' }))).toEqual([
      [kitchen, 'kitchen_agent_assigned'],
      [agent('a2'), 'agent_assigned'],
      [agent('a1'), 'agent_unassigned'],
    ]);
  });

  it('cancelled tells the customer and kitchen, and the agent only if one held the order', () => {
    expect(summary(messagesFor({ kind: 'cancelled' }, order))).toEqual([
      [customer, 'order_cancelled'],
      [kitchen, 'kitchen_order_cancelled'],
    ]);
    const withAgent = messagesFor({ kind: 'cancelled', reason: 'no_agent' }, { ...order, agentId: 'a1' });
    expect(summary(withAgent)).toEqual([
      [customer, 'order_cancelled'],
      [kitchen, 'kitchen_order_cancelled'],
      [agent('a1'), 'agent_order_cancelled'],
    ]);
    expect(withAgent.every((m) => m.params.reason === 'no_agent')).toBe(true);
  });
});
