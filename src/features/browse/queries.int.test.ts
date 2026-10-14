import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/shared/db/client';
import { kitchenContacts } from '@/shared/db/schema';
import { makeCategory, makeDish, makeKitchen, testPhone, truncateAll } from '@/shared/db/test/helpers';
import { getKitchenForCustomer, listKitchensForCustomer } from './queries';

beforeEach(truncateAll);

/** 2026-10-12 (Monday) 12:00 IST: default test hours 11:00–15:00 and 18:00–22:00 are open. */
const NOON = new Date('2026-10-12T12:00:00+05:30');

describe('listKitchensForCustomer', () => {
  it('returns only active kitchens (FR-023)', async () => {
    await makeKitchen({ nameEn: 'Active One' });
    await makeKitchen({ nameEn: 'Pending One', status: 'pending' });
    await makeKitchen({ nameEn: 'Suspended One', status: 'suspended', suspensionReason: 'x' });
    const list = await listKitchensForCustomer({ now: NOON, locale: 'en' });
    expect(list.map((k) => k.name.en)).toEqual(['Active One']);
  });

  it('computes each kitchen’s state and lists open kitchens first, then by localised name', async () => {
    await makeKitchen({ nameEn: 'Zeta Open', nameKn: 'ಅ ಜೀಟಾ' });
    await makeKitchen({ nameEn: 'Alpha Closed' }, { hours: [{ weekday: 1, slot: 1, opensMin: 1110, closesMin: 1380 }] });
    await makeKitchen({ nameEn: 'Beta Open', nameKn: 'ಬ ಬೀಟಾ' });
    await makeKitchen({
      nameEn: 'Gamma Temporarily Closed',
      closedAt: new Date('2026-10-12T11:30:00+05:30'),
      reopensAt: new Date('2026-10-12T18:00:00+05:30'),
    });
    const list = await listKitchensForCustomer({ now: NOON, locale: 'en' });
    expect(list.map((k) => [k.name.en, k.state.kind])).toEqual([
      ['Beta Open', 'open'],
      ['Zeta Open', 'open'],
      ['Alpha Closed', 'closed'],
      ['Gamma Temporarily Closed', 'temporarilyClosed'],
    ]);
  });

  it('reports hours not set for a kitchen with no hours', async () => {
    await makeKitchen({ nameEn: 'No Hours' }, { hours: [] });
    const [k] = await listKitchensForCustomer({ now: NOON, locale: 'en' });
    expect(k?.state).toEqual({ kind: 'hoursNotSet' });
  });
});

describe('getKitchenForCustomer', () => {
  it('returns null for pending, suspended and unknown kitchens', async () => {
    const pending = await makeKitchen({ status: 'pending' });
    const suspended = await makeKitchen({ status: 'suspended', suspensionReason: 'x' });
    expect(await getKitchenForCustomer(pending.id, { now: NOON })).toBeNull();
    expect(await getKitchenForCustomer(suspended.id, { now: NOON })).toBeNull();
    expect(await getKitchenForCustomer('00000000-0000-4000-8000-000000000000', { now: NOON })).toBeNull();
  });

  it('returns categories and dishes in order, including unavailable dishes', async () => {
    const kitchen = await makeKitchen();
    const second = await makeCategory(kitchen.id, { nameEn: 'Second', position: 1 });
    const first = await makeCategory(kitchen.id, { nameEn: 'First', position: 0 });
    await makeDish(kitchen.id, first.id, { nameEn: 'B dish', position: 1 });
    await makeDish(kitchen.id, first.id, { nameEn: 'A dish', position: 0, available: false });
    await makeDish(kitchen.id, second.id, { nameEn: 'C dish' });
    const detail = await getKitchenForCustomer(kitchen.id, { now: NOON });
    expect(detail?.categories.map((c) => c.name.en)).toEqual(['First', 'Second']);
    expect(detail?.categories[0]?.dishes.map((d) => [d.name.en, d.available])).toEqual([
      ['A dish', false],
      ['B dish', true],
    ]);
  });

  it('returns contacts with the primary number first, and the weekly hours', async () => {
    const kitchen = await makeKitchen({}, { contactPhone: '9000009999' });
    await db.insert(kitchenContacts).values({ kitchenId: kitchen.id, phone: testPhone(), isPrimary: false, position: -1 });
    const detail = await getKitchenForCustomer(kitchen.id, { now: NOON });
    expect(detail?.contacts[0]).toEqual({ phone: '9000009999', isPrimary: true });
    expect(detail?.hours[1]).toEqual([
      { opens: 660, closes: 900 },
      { opens: 1080, closes: 1320 },
    ]);
    expect(detail?.state.kind).toBe('open');
  });
});
