import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/shared/db/client';
import { kitchens } from '@/shared/db/schema';
import { adminActor } from '@/shared/db/test/actors';
import { makeAgent, makeOrder, truncateAll } from '@/shared/db/test/helpers';
import { getCustomerOrder } from './queries';
import { cancelOrderByAdmin } from './services/admin';

beforeEach(truncateAll);

const now = new Date('2026-10-15T13:00:00+05:30');
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

describe('getCustomerOrder for the timeline and map (FR-025, FR-026)', () => {
  it('returns events in time order, the agent once assigned, and both map locations', async () => {
    const agent = await makeAgent({ name: 'Ravi' });
    const order = await makeOrder({ status: 'ready', agentId: agent.id, placedAt: minutesAgo(20) });
    const view = await getCustomerOrder(order.customerId, order.id, now);
    expect(view!.events.map((e) => e.kind)).toEqual(['placed', 'assigned', 'ready']);
    expect(view!.agent).toEqual({ name: 'Ravi', phone: agent.phone });
    expect(view!.kitchen.location).toEqual({ lat: 14.28, lng: 74.4445 });
    expect(view!.address.location).toEqual({ lat: 14.2845, lng: 74.451 });
  });

  it('has no kitchen location when the kitchen has none', async () => {
    const order = await makeOrder({ placedAt: minutesAgo(1) });
    await db.update(kitchens).set({ locationLat: null, locationLng: null }).where(eq(kitchens.id, order.kitchenId));
    expect((await getCustomerOrder(order.customerId, order.id, now))!.kitchen.location).toBeNull();
  });

  it('carries the reason and note of a rejected or cancelled order', async () => {
    const order = await makeOrder({ status: 'accepted', placedAt: minutesAgo(5) });
    await cancelOrderByAdmin(await adminActor(), { orderId: order.id, reason: 'other', note: 'Rain, roads closed' }, now);
    expect(await getCustomerOrder(order.customerId, order.id, now)).toMatchObject({
      status: 'cancelled',
      finished: true,
      reason: 'other',
      reasonNote: 'Rain, roads closed',
    });
  });

  it('is null for another customer', async () => {
    const order = await makeOrder({ placedAt: minutesAgo(1) });
    expect(await getCustomerOrder(crypto.randomUUID(), order.id, now)).toBeNull();
  });
});
