import { beforeEach, describe, expect, it } from 'vitest';
import { adminActor } from '@/shared/db/test/actors';
import { makeAgent, makeCustomer, makeOrder, truncateAll } from '@/shared/db/test/helpers';
import { getAgentOrder, getAgentToday, listAgentOrders } from './agent-queries';
import { assignAgent, cancelOrderByAdmin } from './services/admin';

beforeEach(truncateAll);

const now = new Date('2026-10-15T13:00:00+05:30');
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

describe('agent read models (FR-039, FR-040, FR-044)', () => {
  it('lists only the unfinished orders assigned to the agent now', async () => {
    const agent = await makeAgent();
    const ready = await makeOrder({ status: 'ready', agentId: agent.id, placedAt: minutesAgo(20) });
    const out = await makeOrder({ status: 'picked_up', agentId: agent.id, placedAt: minutesAgo(30) });
    await makeOrder({ status: 'delivered', agentId: agent.id, placedAt: minutesAgo(60) });
    await makeOrder({ status: 'ready', agentId: (await makeAgent()).id, placedAt: minutesAgo(5) });
    expect((await listAgentOrders(agent.id)).map((o) => o.id).sort()).toEqual([ready.id, out.id].sort());
  });

  it('counts today’s deliveries and the cash collected, by delivery time in IST', async () => {
    const agent = await makeAgent();
    await makeOrder({ status: 'delivered', agentId: agent.id, paymentMethod: 'cod', placedAt: minutesAgo(60) });
    await makeOrder({ status: 'delivered', agentId: agent.id, paymentMethod: 'upi_demo', placedAt: minutesAgo(40) });
    await makeOrder({ status: 'delivered', agentId: agent.id, paymentMethod: 'cod', placedAt: new Date('2026-10-14T21:00:00+05:30') });
    expect(await getAgentToday(agent.id, now)).toEqual({ deliveries: 2, cashCollected: 150 });
  });

  it('shows the agent’s order with kitchen, customer and address details', async () => {
    const agent = await makeAgent();
    const customer = await makeCustomer({ displayName: 'Asha' });
    const order = await makeOrder({ status: 'ready', agentId: agent.id, customerId: customer.id, placedAt: minutesAgo(20) });
    const view = await getAgentOrder(agent.id, order.id);
    expect(view).toMatchObject({
      state: 'mine',
      order: {
        orderNo: order.orderNo,
        customer: { name: 'Asha', phone: customer.phone },
        address: { house: 'Door 1-23', landmark: 'Behind the temple', riderNote: 'Ring twice' },
        grandTotal: order.grandTotal,
      },
    });
    expect(view!.state === 'mine' && view!.order.kitchen.location).toEqual({ lat: 14.28, lng: 74.4445 });
  });

  it('says when the order was reassigned away or cancelled, and hides orders the agent never had', async () => {
    const agent = await makeAgent();
    const admin = await adminActor();
    const moved = await makeOrder({ status: 'accepted', placedAt: minutesAgo(10) });
    await assignAgent(admin, { orderId: moved.id, agentId: agent.id }, now);
    await assignAgent(admin, { orderId: moved.id, agentId: (await makeAgent()).id }, now);
    expect(await getAgentOrder(agent.id, moved.id)).toEqual({ state: 'reassigned', orderNo: moved.orderNo });

    const cancelled = await makeOrder({ status: 'ready', agentId: agent.id, placedAt: minutesAgo(15) });
    await cancelOrderByAdmin(admin, { orderId: cancelled.id, reason: 'delivery_problem' }, now);
    expect(await getAgentOrder(agent.id, cancelled.id)).toMatchObject({ state: 'cancelled', reason: 'delivery_problem' });

    const stranger = await makeOrder({ status: 'ready', agentId: (await makeAgent()).id, placedAt: minutesAgo(5) });
    expect(await getAgentOrder(agent.id, stranger.id)).toBeNull();
  });
});
