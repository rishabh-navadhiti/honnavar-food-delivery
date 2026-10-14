import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/shared/db/client';
import { admins, agents, customers, dishes, kitchenHours, kitchens, kitchenSignins } from '@/shared/db/schema';
import { truncateAll } from '@/shared/db/test/helpers';
import { WEEKDAYS, emptyWeek } from '../kitchens/domain/hours';
import { kitchenState } from '../kitchens/domain/state';
import { loadCatalogue, readCatalogue } from './load-catalogue';

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
