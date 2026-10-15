import { beforeEach, describe, expect, it } from 'vitest';
import { notifier } from '@/shared/adapters/notifications';
import { db } from '@/shared/db/client';
import { makeAgent, makeOrder, truncateAll } from '@/shared/db/test/helpers';
import { listMessages } from './queries';

beforeEach(truncateAll);

const at = (m: number) => new Date(new Date('2026-10-15T13:00:00+05:30').getTime() + m * 60_000);

describe('listMessages (FR-047)', () => {
  it('returns only the recipient’s messages, newest first, with kitchen and agent names', async () => {
    const agent = await makeAgent({ name: 'Ravi' });
    const order = await makeOrder();
    const other = await makeOrder();
    const send = (o: typeof order, recipient: Parameters<typeof notifier.notify>[1]['recipient'], kind: Parameters<typeof notifier.notify>[1]['kind'], minute: number, params = {}) =>
      notifier.notify(db, { recipient, orderId: o.id, kind, params: { orderNo: o.orderNo, ...params } }, at(minute));

    await send(order, { kind: 'customer', customerId: order.customerId }, 'order_placed', 0, { amount: 150 });
    await send(order, { kind: 'customer', customerId: order.customerId }, 'order_accepted', 2);
    await send(order, { kind: 'kitchen', kitchenId: order.kitchenId }, 'kitchen_agent_assigned', 3, { agentId: agent.id });
    await send(order, { kind: 'agent', agentId: agent.id }, 'agent_assigned', 3);
    await send(other, { kind: 'customer', customerId: other.customerId }, 'order_placed', 1);

    const customer = await listMessages({ kind: 'customer', customerId: order.customerId });
    expect(customer.map((m) => m.kind)).toEqual(['order_accepted', 'order_placed']);
    expect(customer[1]).toMatchObject({ orderId: order.id, params: { orderNo: order.orderNo, amount: 150 }, kitchenName: { en: 'Test Kitchen' } });

    const kitchen = await listMessages({ kind: 'kitchen', kitchenId: order.kitchenId });
    expect(kitchen).toHaveLength(1);
    expect(kitchen[0]!.agentName).toBe('Ravi');

    expect((await listMessages({ kind: 'agent', agentId: agent.id })).map((m) => m.kind)).toEqual(['agent_assigned']);
  });

  it('returns at most 100', async () => {
    const order = await makeOrder();
    for (let i = 0; i < 105; i += 1) {
      await notifier.notify(db, { recipient: { kind: 'customer', customerId: order.customerId }, orderId: order.id, kind: 'order_preparing', params: { orderNo: order.orderNo } }, at(i));
    }
    expect(await listMessages({ kind: 'customer', customerId: order.customerId })).toHaveLength(100);
  });
});
