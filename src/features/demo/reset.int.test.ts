import { asc, eq, sql } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { db } from '@/shared/db/client';
import {
  agents,
  customers,
  dishes,
  kitchenContacts,
  kitchenHours,
  kitchens,
  kitchenSignins,
  menuCategories,
  verifications,
} from '@/shared/db/schema';
import { truncateAll } from '@/shared/db/test/helpers';
import { resetDemo } from './reset-demo';

const url = process.env.TEST_DATABASE_URL!;

/** Everything except timestamps, which legitimately differ between resets. */
async function snapshot() {
  return {
    kitchens: await db
      .select({ id: kitchens.id, nameEn: kitchens.nameEn, nameKn: kitchens.nameKn, status: kitchens.status, pureVeg: kitchens.pureVeg, closed: sql<boolean>`${kitchens.closedAt} is not null` })
      .from(kitchens)
      .orderBy(asc(kitchens.id)),
    dishes: await db
      .select({ id: dishes.id, nameEn: dishes.nameEn, nameKn: dishes.nameKn, price: dishes.priceRupees, available: dishes.available, position: dishes.position })
      .from(dishes)
      .orderBy(asc(dishes.id)),
    categories: await db.select({ id: menuCategories.id, position: menuCategories.position }).from(menuCategories).orderBy(asc(menuCategories.id)),
    contacts: await db.select({ id: kitchenContacts.id, phone: kitchenContacts.phone, isPrimary: kitchenContacts.isPrimary }).from(kitchenContacts).orderBy(asc(kitchenContacts.id)),
    signins: await db.select({ id: kitchenSignins.id, phone: kitchenSignins.phone }).from(kitchenSignins).orderBy(asc(kitchenSignins.id)),
    hours: await db.select().from(kitchenHours).orderBy(asc(kitchenHours.kitchenId), asc(kitchenHours.weekday), asc(kitchenHours.slot)),
    verifications: await db.select({ kitchenId: verifications.kitchenId, reference: verifications.reference }).from(verifications).orderBy(asc(verifications.kitchenId)),
    agents: await db.select({ id: agents.id, active: agents.active }).from(agents).orderBy(asc(agents.id)),
    customers: await db.select({ phone: customers.phone }).from(customers).orderBy(asc(customers.phone)),
  };
}

afterAll(truncateAll);

describe('resetDemo (FR-049, SC-008)', () => {
  it('restores the same known demo state every time', async () => {
    await resetDemo(url);
    const first = await snapshot();
    expect(first.kitchens.length).toBeGreaterThan(0);

    const [dish] = first.dishes;
    await db.update(dishes).set({ available: !dish!.available, priceRupees: 999 }).where(eq(dishes.id, dish!.id));
    await db.update(kitchens).set({ status: 'suspended', suspensionReason: 'test' }).where(eq(kitchens.id, first.kitchens[0]!.id));
    await db.insert(customers).values({ phone: '9876543210' });

    await resetDemo(url);
    expect(await snapshot()).toEqual(first);
  });
});
