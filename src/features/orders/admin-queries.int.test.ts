import { beforeEach, describe, expect, it } from 'vitest';
import { makeAgent, makeCustomer, makeOrder, truncateAll } from '@/shared/db/test/helpers';
import { findOrderByNumber, getAdminOrder, getDispatchBoard } from './admin-queries';

beforeEach(truncateAll);

const now = new Date('2026-10-15T13:00:00+05:30');
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

describe('admin read models (FR-033, FR-038)', () => {
  it('groups orders on the board: unfinished of any day, finished only from today', async () => {
    const agent = await makeAgent();
    const placed = await makeOrder({ placedAt: minutesAgo(2) });
    const needsAgent = await makeOrder({ status: 'accepted', placedAt: minutesAgo(5) });
    const assigned = await makeOrder({ status: 'preparing', agentId: agent.id, placedAt: minutesAgo(8) });
    const out = await makeOrder({ status: 'picked_up', agentId: agent.id, placedAt: minutesAgo(20) });
    const doneToday = await makeOrder({ status: 'delivered', placedAt: minutesAgo(60) });
    const yesterdayOpen = await makeOrder({ status: 'accepted', placedAt: new Date('2026-10-14T21:00:00+05:30') });
    await makeOrder({ status: 'delivered', placedAt: new Date('2026-10-14T20:00:00+05:30') });

    const board = await getDispatchBoard(now);
    const ids = (group: keyof typeof board.groups) => board.groups[group].map((o) => o.id);
    expect(ids('waiting_kitchen')).toEqual([placed.id]);
    expect(ids('needs_agent').sort()).toEqual([needsAgent.id, yesterdayOpen.id].sort());
    expect(ids('assigned')).toEqual([assigned.id]);
    expect(ids('out_for_delivery')).toEqual([out.id]);
    expect(ids('finished')).toEqual([doneToday.id]);
    expect(board.groups.assigned[0]!.agentName).toBe('Test Agent');
  });

  it('lists active agents with how many undelivered orders each holds', async () => {
    const busy = await makeAgent({ name: 'Busy' });
    const idle = await makeAgent({ name: 'Idle' });
    await makeAgent({ name: 'Off', active: false });
    await makeOrder({ status: 'ready', agentId: busy.id, placedAt: minutesAgo(10) });
    await makeOrder({ status: 'picked_up', agentId: busy.id, placedAt: minutesAgo(20) });
    await makeOrder({ status: 'delivered', agentId: busy.id, placedAt: minutesAgo(40) });
    const board = await getDispatchBoard(now);
    expect(board.agents.map((a) => [a.name, a.undelivered])).toEqual([
      ['Busy', 2],
      ['Idle', 0],
    ]);
    expect(board.agents.find((a) => a.id === idle.id)).toBeDefined();
  });

  it('shows everything about one order, with its history in time order', async () => {
    const customer = await makeCustomer({ displayName: 'Asha' });
    const agent = await makeAgent();
    const order = await makeOrder({ customerId: customer.id, status: 'ready', agentId: agent.id, placedAt: minutesAgo(15) });
    const view = await getAdminOrder(order.id, now);
    expect(view).toMatchObject({
      orderNo: order.orderNo,
      customer: { name: 'Asha', phone: customer.phone },
      address: { house: 'Door 1-23', landmark: 'Behind the temple', riderNote: 'Ring twice' },
      agent: { id: agent.id },
    });
    expect(view!.events.map((e) => e.kind)).toEqual(['placed', 'assigned', 'ready']);
    expect(view!.events[0]).toMatchObject({ actor: 'customer' });
  });

  it('finds an order by its number', async () => {
    const order = await makeOrder({ placedAt: minutesAgo(1) });
    expect(await findOrderByNumber(order.orderNo)).toBe(order.id);
    expect(await findOrderByNumber(999_999)).toBeNull();
  });
});
