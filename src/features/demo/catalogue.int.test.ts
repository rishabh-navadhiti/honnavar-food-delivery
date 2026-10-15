import { and, asc, eq, isNotNull, isNull } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/shared/db/client';
import {
  admins,
  agents,
  customerAddresses,
  customers,
  dishes,
  kitchenHours,
  kitchens,
  kitchenSignins,
  messages,
  orderEvents,
  orders,
} from '@/shared/db/schema';
import { messagesFor } from '../notifications/domain/messages-for';
import { canTransition, type LifecycleActor, type OrderAction, type OrderState } from '../orders/domain/lifecycle';
import { istDayBounds } from '../orders/domain/today';
import { truncateAll } from '@/shared/db/test/helpers';
import { WEEKDAYS, emptyWeek } from '../kitchens/domain/hours';
import { kitchenState } from '../kitchens/domain/state';
import { demoIds } from './ids';
import { loadCatalogue, readCatalogue } from './load-catalogue';

// Loading the full researched catalogue (and resizing its seed images) takes longer than the 5 s default.
vi.setConfig({ testTimeout: 180_000, hookTimeout: 180_000 });

beforeEach(truncateAll);

const NOW = new Date('2026-10-12T13:00:00+05:30');

describe('demo catalogue coverage (FR-050 to FR-052)', () => {
  it('validates and loads', async () => {
    const summary = await loadCatalogue(db, readCatalogue(), { now: NOW, imagesDir: '/nonexistent' });
    expect(summary.kitchens).toBeGreaterThan(0);
  });

  it('meets FR-050: at least 8 kitchens of every type, pure-veg and non-veg', async () => {
    await loadCatalogue(db, readCatalogue(), { now: NOW });
    const rows = await db.select().from(kitchens);
    const count = (type: string) => rows.filter((k) => k.type === type).length;
    expect(rows.length).toBeGreaterThanOrEqual(8);
    expect(count('restaurant')).toBeGreaterThanOrEqual(3);
    expect(count('home_kitchen')).toBeGreaterThanOrEqual(3);
    expect(count('cloud_kitchen')).toBeGreaterThanOrEqual(2);
    expect(rows.some((k) => k.pureVeg)).toBe(true);
    expect(rows.some((k) => !k.pureVeg)).toBe(true);
  });

  it('meets FR-051: every special demo state is present', async () => {
    await loadCatalogue(db, readCatalogue(), { now: NOW });
    const rows = await db.select().from(kitchens);
    expect(await db.$count(dishes, isNull(dishes.nameKn))).toBeGreaterThan(0);
    expect(rows.some((k) => k.closedAt && (!k.reopensAt || k.reopensAt > NOW))).toBe(true);
    expect(rows.some((k) => k.status === 'pending')).toBe(true);
    expect(rows.some((k) => k.status === 'suspended' && k.suspensionReason)).toBe(true);
    expect(await db.$count(dishes, eq(dishes.available, false))).toBeGreaterThan(0);

    const hours = await db.select().from(kitchenHours);
    const closedByHours = rows
      .filter((k) => k.status === 'active' && !k.closedAt)
      .some((k) => {
        const week = emptyWeek();
        for (const h of hours.filter((x) => x.kitchenId === k.id)) {
          week[h.weekday as (typeof WEEKDAYS)[number]].push({ opens: h.opensMin, closes: h.closesMin });
        }
        return kitchenState({ closedAt: null, reopensAt: null }, week, NOW).kind === 'closed';
      });
    expect(closedByHours).toBe(true);
  });

  it('meets FR-052: demo accounts for every role', async () => {
    await loadCatalogue(db, readCatalogue(), { now: NOW });
    expect(await db.$count(admins)).toBeGreaterThanOrEqual(1);
    expect(await db.$count(customers)).toBeGreaterThanOrEqual(1);
    expect(await db.$count(agents, eq(agents.active, true))).toBeGreaterThanOrEqual(2);
    expect(await db.$count(agents, eq(agents.active, false))).toBeGreaterThanOrEqual(1);
    const rows = await db.select().from(kitchens);
    const signins = await db.select().from(kitchenSignins);
    for (const k of rows) expect(signins.some((s) => s.kitchenId === k.id), k.nameEn ?? k.id).toBe(true);
    const perKitchen = rows.map((k) => signins.filter((s) => s.kitchenId === k.id).length);
    expect(perKitchen.some((n) => n >= 2)).toBe(true);
  });

  it('gives identical ids on every load', async () => {
    await loadCatalogue(db, readCatalogue(), { now: NOW });
    const first = (await db.select({ id: dishes.id }).from(dishes)).map((r) => r.id).sort();
    await truncateAll();
    await loadCatalogue(db, readCatalogue(), { now: NOW });
    const second = (await db.select({ id: dishes.id }).from(dishes)).map((r) => r.id).sort();
    expect(second).toEqual(first);
  });

  it('falls back to placeholders when image files are missing', async () => {
    const summary = await loadCatalogue(db, readCatalogue(), { now: NOW, imagesDir: '/nonexistent' });
    expect(summary.missingImages).toBeGreaterThan(0);
    expect(await db.$count(kitchens, and(isNotNull(kitchens.photoImageId)))).toBe(0);
  });
});

type EventRow = typeof orderEvents.$inferSelect;

/** Replay one recorded event through the lifecycle, as the action that produced it. */
function replay(state: OrderState, event: EventRow): ReturnType<typeof canTransition> {
  const actor: LifecycleActor =
    event.actor === 'agent' ? { role: 'agent', agentId: state.agentId ?? '' } : { role: event.actor };
  const actions: Record<string, OrderAction> = {
    accepted: { type: 'accept' },
    rejected: event.actor === 'system' ? { type: 'expire' } : { type: 'reject' },
    preparing: { type: 'preparing' },
    ready: { type: 'ready' },
    assigned: { type: 'assign', agentId: event.agentId ?? '', agentActive: true },
    reassigned: { type: 'assign', agentId: event.agentId ?? '', agentActive: true },
    picked_up: { type: 'pickup' },
    delivered: { type: 'deliver', cashConfirmed: true },
    cancelled: { type: 'cancel' },
  };
  return canTransition(state, actions[event.kind]!, actor);
}

describe('002 ordering seed (FR-050, FR-051)', () => {
  it('gives every kitchen a map location and preparation minutes', async () => {
    await loadCatalogue(db, readCatalogue(), { now: NOW, imagesDir: '/nonexistent' });
    const rows = await db.select().from(kitchens);
    for (const k of rows) {
      expect(k.locationLat, k.nameEn ?? k.id).not.toBeNull();
      expect(k.locationLng, k.nameEn ?? k.id).not.toBeNull();
      expect(k.prepMinutes).toBeGreaterThanOrEqual(5);
    }
  });

  it('gives the demo customer two addresses, one with a rider note', async () => {
    await loadCatalogue(db, readCatalogue(), { now: NOW, imagesDir: '/nonexistent' });
    const catalogue = readCatalogue();
    const customerId = demoIds.customer(catalogue.customers[0]!.key);
    const addresses = await db.select().from(customerAddresses).where(eq(customerAddresses.customerId, customerId));
    expect(addresses).toHaveLength(2);
    expect(addresses.some((a) => a.riderNote)).toBe(true);
  });

  it('has an order in every required state, all placed today and within 90 minutes', async () => {
    await loadCatalogue(db, readCatalogue(), { now: NOW, imagesDir: '/nonexistent' });
    const rows = await db.select().from(orders).orderBy(asc(orders.orderNo));
    const has = (pred: (o: (typeof rows)[number]) => boolean) => rows.some(pred);
    expect(has((o) => o.status === 'placed')).toBe(true);
    expect(has((o) => o.status === 'accepted' && !o.agentId)).toBe(true);
    expect(has((o) => o.status === 'ready' && Boolean(o.agentId))).toBe(true);
    expect(has((o) => o.status === 'picked_up')).toBe(true);
    expect(has((o) => o.status === 'delivered' && o.paymentMethod === 'cod' && o.cashCollected === o.grandTotal)).toBe(true);
    expect(has((o) => o.status === 'rejected' && Boolean(o.reason))).toBe(true);
    expect(has((o) => o.status === 'cancelled')).toBe(true);

    const placed = rows.find((o) => o.status === 'placed')!;
    expect(placed.placedAt).toEqual(NOW);
    const { start } = istDayBounds(NOW);
    for (const o of rows) {
      expect(o.placedAt.getTime()).toBeGreaterThanOrEqual(start.getTime());
      expect(NOW.getTime() - o.placedAt.getTime()).toBeLessThanOrEqual(90 * 60_000);
    }
  });

  it('numbers orders from 1001 in catalogue order, identically on every load', async () => {
    const catalogue = readCatalogue();
    await loadCatalogue(db, catalogue, { now: NOW, imagesDir: '/nonexistent' });
    const first = await db.select({ id: orders.id, no: orders.orderNo }).from(orders).orderBy(asc(orders.orderNo));
    expect(first.map((o) => o.id)).toEqual(catalogue.orders.map((o) => demoIds.order(o.key)));
    expect(first.map((o) => o.no)).toEqual(catalogue.orders.map((_, i) => 1001 + i));
    await truncateAll();
    await loadCatalogue(db, catalogue, { now: NOW, imagesDir: '/nonexistent' });
    const second = await db.select({ id: orders.id, no: orders.orderNo }).from(orders).orderBy(asc(orders.orderNo));
    expect(second).toEqual(first);
  });

  it('assigns the Ready order to the first active agent', async () => {
    const catalogue = readCatalogue();
    await loadCatalogue(db, catalogue, { now: NOW, imagesDir: '/nonexistent' });
    const [ready] = await db.select().from(orders).where(eq(orders.status, 'ready'));
    const firstActive = catalogue.agents.find((a) => a.active)!;
    expect(ready!.agentId).toBe(demoIds.agent(firstActive.key));
  });

  it('records events that follow the lifecycle, with exactly the messages live orders would get', async () => {
    await loadCatalogue(db, readCatalogue(), { now: NOW, imagesDir: '/nonexistent' });
    for (const order of await db.select().from(orders)) {
      const events = await db.select().from(orderEvents).where(eq(orderEvents.orderId, order.id)).orderBy(asc(orderEvents.at));
      expect(events[0]!.kind).toBe('placed');
      let state: OrderState = { status: 'placed', agentId: null, paymentMethod: order.paymentMethod };
      const expected = messagesFor({ kind: 'placed' }, { ...order, agentId: null }).map((m) => `${m.recipient.kind}:${m.kind}`);
      for (const event of events.slice(1)) {
        const result = replay(state, event);
        expect(result.ok, `#${order.orderNo} ${event.kind}`).toBe(true);
        if (!result.ok) break;
        expected.push(
          ...messagesFor(
            { kind: event.kind, agentId: event.agentId, previousAgentId: event.previousAgentId, reason: event.reason, reasonNote: event.reasonNote },
            { ...order, agentId: state.agentId },
          ).map((m) => `${m.recipient.kind}:${m.kind}`),
        );
        state = { ...state, status: result.next.status, agentId: result.next.agentId };
      }
      expect(state.status, `#${order.orderNo}`).toBe(order.status);
      const actual = (await db.select().from(messages).where(eq(messages.orderId, order.id))).map(
        (m) => `${m.recipient}:${m.kind}`,
      );
      expect(actual.sort(), `#${order.orderNo}`).toEqual(expected.sort());
    }
  });

  it('never puts a Placed or Rejected order at a real business (menuSource: researched)', async () => {
    const catalogue = readCatalogue();
    await loadCatalogue(db, catalogue, { now: NOW, imagesDir: '/nonexistent' });
    const sourceById = new Map(catalogue.kitchens.map((k) => [demoIds.kitchen(k.key), k.menuSource]));
    const sensitive = await db.select().from(orders);
    for (const o of sensitive.filter((x) => x.status === 'placed' || x.status === 'rejected')) {
      expect(sourceById.get(o.kitchenId), `#${o.orderNo}`).toBe('fabricated');
    }
  });
});
