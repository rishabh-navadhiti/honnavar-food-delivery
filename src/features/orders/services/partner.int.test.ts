import { asc, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/shared/db/client';
import { messages, orderEvents, orders } from '@/shared/db/schema';
import { partnerActor } from '@/shared/db/test/actors';
import { makeOrder, truncateAll } from '@/shared/db/test/helpers';
import { env } from '@/shared/env';
import { acceptOrder, markPreparing, markReady, rejectOrder } from './partner';

beforeEach(truncateAll);

const now = new Date('2026-10-15T13:00:00+05:30');
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);
const status = async (id: string) => (await db.select({ s: orders.status }).from(orders).where(eq(orders.id, id)))[0]!.s;

describe('partner order services (US2, FR-030)', () => {
  it('accepts, then marks preparing and ready, each with its event and messages', async () => {
    const order = await makeOrder({ placedAt: minutesAgo(2) });
    const partner = await partnerActor(order.kitchenId);
    expect((await acceptOrder(partner, { orderId: order.id }, now)).ok).toBe(true);
    expect((await markPreparing(partner, { orderId: order.id }, now)).ok).toBe(true);
    expect((await markReady(partner, { orderId: order.id }, now)).ok).toBe(true);
    expect(await status(order.id)).toBe('ready');
    const kinds = (await db.select().from(orderEvents).where(eq(orderEvents.orderId, order.id)).orderBy(asc(orderEvents.at))).map((e) => e.kind);
    expect(kinds).toEqual(['placed', 'accepted', 'preparing', 'ready']);
    const sent = (await db.select().from(messages).where(eq(messages.orderId, order.id))).map((m) => m.kind).sort();
    expect(sent).toEqual(['order_accepted', 'order_preparing']);
  });

  it('rejects with a reason from the partner list; "other" needs a note of at most 200 characters', async () => {
    const order = await makeOrder({ placedAt: minutesAgo(2) });
    const partner = await partnerActor(order.kitchenId);
    expect(await rejectOrder(partner, { orderId: order.id, reason: 'no_agent' }, now)).toMatchObject({ ok: false, error: { code: 'invalid' } });
    expect(await rejectOrder(partner, { orderId: order.id, reason: 'other' }, now)).toMatchObject({
      ok: false,
      error: { code: 'invalid', fieldErrors: { note: 'noteRequired' } },
    });
    expect(await rejectOrder(partner, { orderId: order.id, reason: 'other', note: 'x'.repeat(201) }, now)).toMatchObject({
      ok: false,
      error: { fieldErrors: { note: 'tooLong' } },
    });
    expect((await rejectOrder(partner, { orderId: order.id, reason: 'kitchen_busy' }, now)).ok).toBe(true);
    const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(row).toMatchObject({ status: 'rejected', reason: 'kitchen_busy' });
  });

  it('refuses another kitchen’s order as not found', async () => {
    const order = await makeOrder({ placedAt: minutesAgo(2) });
    const other = await makeOrder({ placedAt: minutesAgo(2) });
    const partner = await partnerActor(other.kitchenId);
    expect(await acceptOrder(partner, { orderId: order.id }, now)).toMatchObject({ ok: false, error: { code: 'not_found' } });
  });

  it('refuses a step out of order as moved on', async () => {
    const order = await makeOrder({ placedAt: minutesAgo(2) });
    const partner = await partnerActor(order.kitchenId);
    expect(await markReady(partner, { orderId: order.id }, now)).toMatchObject({
      ok: false,
      error: { code: 'order_moved_on', details: { status: 'placed' } },
    });
  });

  it('refuses a late accept once the window has passed; the system rejection is recorded', async () => {
    const order = await makeOrder({ placedAt: minutesAgo(env.ACCEPT_WINDOW_MINUTES + 1) });
    const partner = await partnerActor(order.kitchenId);
    expect(await acceptOrder(partner, { orderId: order.id }, now)).toEqual({
      ok: false,
      error: { code: 'order_moved_on', details: { status: 'rejected' } },
    });
    const events = await db.select().from(orderEvents).where(eq(orderEvents.orderId, order.id));
    expect(events.some((e) => e.kind === 'rejected' && e.actor === 'system')).toBe(true);
  });
});
