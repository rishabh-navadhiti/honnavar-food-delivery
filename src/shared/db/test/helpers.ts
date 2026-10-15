import { sql } from 'drizzle-orm';
import { db } from '../client';
import {
  admins,
  agents,
  dishes,
  kitchenContacts,
  kitchenHours,
  kitchens,
  kitchenSignins,
  menuCategories,
} from '../schema';

export const testDb = db;

let phoneCounter = 0;
/** A unique, valid 10-digit test phone number (91111xxxxx block). */
export function testPhone(): string {
  phoneCounter += 1;
  return `91111${String(phoneCounter).padStart(5, '0')}`;
}

export async function truncateAll(): Promise<void> {
  await db.execute(sql`
    truncate table sessions, dishes, menu_categories, verifications, kitchen_hours, kitchen_signins,
      kitchen_contacts, kitchens, images, agents, admins, customers restart identity cascade
  `);
}

export async function makeAdmin(overrides: Partial<typeof admins.$inferInsert> = {}) {
  const [row] = await db
    .insert(admins)
    .values({ phone: testPhone(), name: 'Test Admin', ...overrides })
    .returning();
  return row!;
}

export async function makeAgent(overrides: Partial<typeof agents.$inferInsert> = {}) {
  const [row] = await db
    .insert(agents)
    .values({ phone: testPhone(), name: 'Test Agent', vehicleType: 'two_wheeler', ...overrides })
    .returning();
  return row!;
}

type HoursRow = { weekday: number; slot: number; opensMin: number; closesMin: number };

/** Default hours: every day 11:00–15:00 and 18:00–22:00. */
export const defaultHours: HoursRow[] = [1, 2, 3, 4, 5, 6, 7].flatMap((weekday) => [
  { weekday, slot: 1, opensMin: 660, closesMin: 900 },
  { weekday, slot: 2, opensMin: 1080, closesMin: 1320 },
]);

export async function makeKitchen(
  overrides: Partial<typeof kitchens.$inferInsert> = {},
  options: { hours?: HoursRow[]; contactPhone?: string } = {},
) {
  const [kitchen] = await db
    .insert(kitchens)
    .values({
      nameEn: 'Test Kitchen',
      nameKn: 'ಪರೀಕ್ಷಾ ಅಡುಗೆಮನೆ',
      type: 'restaurant',
      pureVeg: false,
      address: 'Main Road, Honnavar',
      landmark: 'Near bus stand',
      status: 'active',
      ...overrides,
    })
    .returning();
  await db
    .insert(kitchenContacts)
    .values({ kitchenId: kitchen!.id, phone: options.contactPhone ?? testPhone(), isPrimary: true });
  const hours = options.hours ?? defaultHours;
  if (hours.length > 0) {
    await db.insert(kitchenHours).values(hours.map((h) => ({ kitchenId: kitchen!.id, ...h })));
  }
  return kitchen!;
}

export async function makeSignin(kitchenId: string, overrides: Partial<typeof kitchenSignins.$inferInsert> = {}) {
  const [row] = await db
    .insert(kitchenSignins)
    .values({ kitchenId, phone: testPhone(), personName: 'Test Owner', ...overrides })
    .returning();
  return row!;
}

export async function makeCategory(kitchenId: string, overrides: Partial<typeof menuCategories.$inferInsert> = {}) {
  const [row] = await db
    .insert(menuCategories)
    .values({ kitchenId, nameEn: 'Meals', nameKn: 'ಊಟ', ...overrides })
    .returning();
  return row!;
}

export async function makeDish(
  kitchenId: string,
  categoryId: string,
  overrides: Partial<typeof dishes.$inferInsert> = {},
) {
  const [row] = await db
    .insert(dishes)
    .values({
      kitchenId,
      categoryId,
      nameEn: 'Neer dose',
      nameKn: 'ನೀರ್ ದೋಸೆ',
      priceRupees: 60,
      isVeg: true,
      ...overrides,
    })
    .returning();
  return row!;
}
