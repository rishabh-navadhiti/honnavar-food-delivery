import 'server-only';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { dishes, kitchenContacts, kitchenHours, kitchens, kitchenSignins, menuCategories, verifications } from '@/shared/db/schema';
import { emptyWeek, type Weekday, type WeekHours } from './domain/hours';
import { kitchenState } from './domain/state';

/** Weekly hours for each kitchen, in minutes, slots in order. Kitchens with no rows get an empty week. */
export async function loadWeekHours(kitchenIds: string[]): Promise<Map<string, WeekHours>> {
  const result = new Map<string, WeekHours>(kitchenIds.map((id) => [id, emptyWeek()]));
  if (kitchenIds.length === 0) return result;
  const rows = await db.select().from(kitchenHours).where(inArray(kitchenHours.kitchenId, kitchenIds));
  rows.sort((a, b) => a.slot - b.slot);
  for (const row of rows) {
    result.get(row.kitchenId)?.[row.weekday as Weekday].push({ opens: row.opensMin, closes: row.closesMin });
  }
  return result;
}

export async function getKitchenRow(kitchenId: string) {
  const [row] = await db.select().from(kitchens).where(eq(kitchens.id, kitchenId));
  return row ?? null;
}

/** The partner dashboard: status, reason, live state and missing translations (FR-036, FR-037). */
export async function getPartnerDashboard(kitchenId: string, now: Date) {
  const kitchen = await getKitchenRow(kitchenId);
  if (!kitchen) return null;
  const week = (await loadWeekHours([kitchenId])).get(kitchenId)!;
  const [missingCategories, missingDishes] = await Promise.all([
    db.$count(menuCategories, and(eq(menuCategories.kitchenId, kitchenId), missingName(menuCategories))),
    db.$count(dishes, and(eq(dishes.kitchenId, kitchenId), missingName(dishes))),
  ]);
  return {
    kitchen,
    state: kitchenState({ closedAt: kitchen.closedAt, reopensAt: kitchen.reopensAt }, week, now),
    missingTranslations: missingCategories + missingDishes,
  };
}

function missingName(table: typeof dishes | typeof menuCategories) {
  return sql`(coalesce(btrim(${table.nameEn}), '') = '' or coalesce(btrim(${table.nameKn}), '') = '')`;
}

export type EditorDish = typeof dishes.$inferSelect;
export type EditorCategory = typeof menuCategories.$inferSelect & { dishes: EditorDish[] };

/** The whole menu with each item's last-change stamp (FR-055), in display order. */
export async function getMenuForEditor(kitchenId: string): Promise<EditorCategory[]> {
  const [categories, dishRows] = await Promise.all([
    db.select().from(menuCategories).where(eq(menuCategories.kitchenId, kitchenId)).orderBy(asc(menuCategories.position)),
    db.select().from(dishes).where(eq(dishes.kitchenId, kitchenId)).orderBy(asc(dishes.position)),
  ]);
  return categories.map((c) => ({ ...c, dishes: dishRows.filter((d) => d.categoryId === c.id) }));
}

export async function getCategoryForEditor(kitchenId: string, categoryId: string) {
  const [row] = await db
    .select()
    .from(menuCategories)
    .where(and(eq(menuCategories.id, categoryId), eq(menuCategories.kitchenId, kitchenId)));
  return row ?? null;
}

export async function getDishForEditor(kitchenId: string, dishId: string) {
  const [row] = await db
    .select()
    .from(dishes)
    .where(and(eq(dishes.id, dishId), eq(dishes.kitchenId, kitchenId)));
  return row ?? null;
}

export async function getContacts(kitchenId: string) {
  return db.select().from(kitchenContacts).where(eq(kitchenContacts.kitchenId, kitchenId)).orderBy(asc(kitchenContacts.position));
}

export async function getSignins(kitchenId: string) {
  return db.select().from(kitchenSignins).where(eq(kitchenSignins.kitchenId, kitchenId)).orderBy(asc(kitchenSignins.createdAt));
}

export type AdminKitchenRow = {
  id: string;
  nameEn: string | null;
  nameKn: string | null;
  type: 'restaurant' | 'home_kitchen' | 'cloud_kitchen';
  status: 'pending' | 'active' | 'suspended';
  pureVeg: boolean;
  landmark: string;
  primaryPhone: string | null;
};

/** Partner list for admins (FR-024): filter by status and type; search either name or any phone. */
export async function listKitchensForAdmin(filters: {
  status?: 'pending' | 'active' | 'suspended';
  type?: 'restaurant' | 'home_kitchen' | 'cloud_kitchen';
  q?: string;
}): Promise<AdminKitchenRow[]> {
  const conditions = [];
  if (filters.status) conditions.push(eq(kitchens.status, filters.status));
  if (filters.type) conditions.push(eq(kitchens.type, filters.type));
  const q = filters.q?.normalize('NFC').trim();
  if (q) {
    const text = `%${q}%`;
    const digits = q.replace(/\D/g, '');
    const phoneMatch = digits.length >= 3
      ? sql` or exists (select 1 from kitchen_contacts c where c.kitchen_id = ${kitchens.id} and c.phone like ${`%${digits}%`})
             or exists (select 1 from kitchen_signins s where s.kitchen_id = ${kitchens.id} and s.phone like ${`%${digits}%`})`
      : sql``;
    conditions.push(sql`(${kitchens.nameEn} ilike ${text} or ${kitchens.nameKn} ilike ${text}${phoneMatch})`);
  }
  const rows = await db
    .select({
      id: kitchens.id,
      nameEn: kitchens.nameEn,
      nameKn: kitchens.nameKn,
      type: kitchens.type,
      status: kitchens.status,
      pureVeg: kitchens.pureVeg,
      landmark: kitchens.landmark,
      primaryPhone: kitchenContacts.phone,
    })
    .from(kitchens)
    // A join, not a correlated subselect: in a single-table select Drizzle renders `${kitchens.id}`
    // unqualified, which inside a subquery would resolve to kitchen_contacts.id.
    .leftJoin(kitchenContacts, and(eq(kitchenContacts.kitchenId, kitchens.id), eq(kitchenContacts.isPrimary, true)))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(kitchens.nameEn), asc(kitchens.nameKn));
  return rows;
}

export async function getVerification(kitchenId: string) {
  const [row] = await db.select().from(verifications).where(eq(verifications.kitchenId, kitchenId));
  return row ?? null;
}
