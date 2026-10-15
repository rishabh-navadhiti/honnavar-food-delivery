import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { admins, agents, customers, kitchens, kitchenSignins } from '@/shared/db/schema';
import type { LocalizedPair } from '@/shared/i18n/localized';
import type { Surface } from '../auth/surfaces';

export type DemoAccount = { phone: string; name: string | null; kitchen?: LocalizedPair };

/** The accounts that can sign in on a surface right now, for the demo-only panel (FR-011). */
export async function getDemoAccounts(surface: Surface): Promise<DemoAccount[]> {
  switch (surface) {
    case 'customer':
      return (await db.select().from(customers).orderBy(asc(customers.createdAt)).limit(5)).map((c) => ({
        phone: c.phone,
        name: c.displayName,
      }));
    case 'admin':
      return (await db.select().from(admins).orderBy(asc(admins.name))).map((a) => ({ phone: a.phone, name: a.name }));
    case 'agent':
      return (await db.select().from(agents).orderBy(asc(agents.name))).map((a) => ({ phone: a.phone, name: a.name }));
    case 'partner':
      return (
        await db
          .select({ phone: kitchenSignins.phone, name: kitchenSignins.personName, nameEn: kitchens.nameEn, nameKn: kitchens.nameKn })
          .from(kitchenSignins)
          .innerJoin(kitchens, eq(kitchens.id, kitchenSignins.kitchenId))
          .orderBy(asc(kitchens.nameEn), asc(kitchenSignins.phone))
      ).map((r) => ({ phone: r.phone, name: r.name, kitchen: { en: r.nameEn, kn: r.nameKn } }));
  }
}
