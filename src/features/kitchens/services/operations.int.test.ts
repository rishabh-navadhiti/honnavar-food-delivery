import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/shared/db/client';
import { kitchenHours, kitchens } from '@/shared/db/schema';
import { partnerActor } from '@/shared/db/test/actors';
import { makeKitchen, truncateAll } from '@/shared/db/test/helpers';
import { closeTemporarily, reopen, saveHours } from './operations';

beforeEach(truncateAll);

const ist = (local: string) => new Date(`${local}:00+05:30`);
const LUNCH = ist('2026-10-12T12:00');

const everyDay = (ranges: { opens: string; closes: string }[]) =>
  Object.fromEntries(['1', '2', '3', '4', '5', '6', '7'].map((d) => [d, ranges]));

describe('closeTemporarily / reopen (FR-031)', () => {
  it('closes until the next period and stamps the partner', async () => {
    const kitchen = await makeKitchen();
    const actor = await partnerActor(kitchen.id);
    const result = await closeTemporarily(actor, {}, LUNCH);
    expect(result).toEqual({ ok: true, data: { reopensAt: ist('2026-10-12T18:00') } });
    const [row] = await db.select().from(kitchens).where(eq(kitchens.id, kitchen.id));
    expect(row).toMatchObject({
      closedAt: LUNCH,
      reopensAt: ist('2026-10-12T18:00'),
      closureUpdatedByRole: 'partner',
      closureUpdatedByPhone: actor.phone,
    });
  });

  it('refuses to close twice while closed', async () => {
    const kitchen = await makeKitchen();
    const actor = await partnerActor(kitchen.id);
    await closeTemporarily(actor, {}, LUNCH);
    expect(await closeTemporarily(actor, {}, ist('2026-10-12T13:00'))).toEqual({ ok: false, error: { code: 'already_closed' } });
  });

  it('can close again once the earlier closure has ended', async () => {
    const kitchen = await makeKitchen();
    const actor = await partnerActor(kitchen.id);
    await closeTemporarily(actor, {}, LUNCH);
    expect((await closeTemporarily(actor, {}, ist('2026-10-12T19:00'))).ok).toBe(true);
  });

  it('reopens early, or refuses when not closed', async () => {
    const kitchen = await makeKitchen();
    const actor = await partnerActor(kitchen.id);
    expect(await reopen(actor, {}, LUNCH)).toEqual({ ok: false, error: { code: 'not_closed' } });
    await closeTemporarily(actor, {}, LUNCH);
    expect((await reopen(actor, {}, ist('2026-10-12T12:30'))).ok).toBe(true);
    const [row] = await db.select().from(kitchens).where(eq(kitchens.id, kitchen.id));
    expect(row).toMatchObject({ closedAt: null, reopensAt: null });
  });

  it('refuses to act on another kitchen (FR-030)', async () => {
    const own = await makeKitchen();
    const other = await makeKitchen();
    const actor = await partnerActor(own.id);
    expect(await closeTemporarily(actor, { kitchenId: other.id }, LUNCH)).toEqual({
      ok: false,
      error: { code: 'unauthorised' },
    });
  });
});

describe('saveHours (FR-032)', () => {
  it('replaces all rows and stamps the partner', async () => {
    const kitchen = await makeKitchen();
    const actor = await partnerActor(kitchen.id);
    const hours = { ...everyDay([{ opens: '09:00', closes: '13:00' }]), '7': [] };
    expect((await saveHours(actor, { hours }, LUNCH)).ok).toBe(true);
    const rows = await db.select().from(kitchenHours).where(eq(kitchenHours.kitchenId, kitchen.id));
    expect(rows).toHaveLength(6);
    expect(rows.every((r) => r.opensMin === 540 && r.closesMin === 780)).toBe(true);
    const [row] = await db.select().from(kitchens).where(eq(kitchens.id, kitchen.id));
    expect(row).toMatchObject({ hoursUpdatedByRole: 'partner', hoursUpdatedByPhone: actor.phone });
  });

  it('reports range order and overlap errors per day', async () => {
    const kitchen = await makeKitchen();
    const actor = await partnerActor(kitchen.id);
    const hours = {
      ...everyDay([]),
      '2': [{ opens: '15:00', closes: '11:00' }],
      '4': [
        { opens: '11:00', closes: '15:00' },
        { opens: '14:00', closes: '18:00' },
      ],
    };
    expect(await saveHours(actor, { hours }, LUNCH)).toEqual({
      ok: false,
      error: { code: 'invalid', fieldErrors: { 'hours.2': 'rangeOrder', 'hours.4': 'rangeOverlap' } },
    });
  });

  it('reports malformed times', async () => {
    const kitchen = await makeKitchen();
    const actor = await partnerActor(kitchen.id);
    const result = await saveHours(actor, { hours: { ...everyDay([]), '1': [{ opens: '9am', closes: '13:00' }] } }, LUNCH);
    expect(result).toEqual({ ok: false, error: { code: 'invalid', fieldErrors: { 'hours.1': 'invalidTime' } } });
  });

  it('recalculates the reopening time while temporarily closed', async () => {
    const kitchen = await makeKitchen();
    const actor = await partnerActor(kitchen.id);
    await closeTemporarily(actor, {}, LUNCH);
    await saveHours(actor, { hours: everyDay([{ opens: '11:00', closes: '15:00' }, { opens: '17:00', closes: '22:00' }]) }, LUNCH);
    const [row] = await db.select().from(kitchens).where(eq(kitchens.id, kitchen.id));
    expect(row!.reopensAt).toEqual(ist('2026-10-12T17:00'));
  });
});
