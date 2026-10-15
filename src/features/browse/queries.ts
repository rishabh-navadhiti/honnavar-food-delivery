import 'server-only';
import { and, asc, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { dishes, kitchenContacts, kitchens, menuCategories } from '@/shared/db/schema';
import { intlTag, type Locale } from '@/shared/i18n/config';
import { pickLocalized, type LocalizedPair } from '@/shared/i18n/localized';
import type { WeekHours } from '../kitchens/domain/hours';
import { kitchenState, type KitchenState } from '../kitchens/domain/state';
import { loadWeekHours } from '../kitchens/queries';
import { filterMenu, type DishFilter } from './domain/dish-filter';

export type KitchenType = 'restaurant' | 'home_kitchen' | 'cloud_kitchen';

export type KitchenSummary = {
  id: string;
  name: LocalizedPair;
  type: KitchenType;
  pureVeg: boolean;
  photoImageId: string | null;
  landmark: string;
  state: KitchenState;
};

export type DishView = {
  id: string;
  name: LocalizedPair;
  description: LocalizedPair;
  priceRupees: number;
  isVeg: boolean;
  available: boolean;
  photoImageId: string | null;
};

export type CategoryView = { id: string; name: LocalizedPair; dishes: DishView[] };

export type KitchenDetail = KitchenSummary & {
  description: LocalizedPair;
  address: string;
  contacts: { phone: string; isPrimary: boolean }[];
  hours: WeekHours;
  categories: CategoryView[];
  /** The dish filter hid every dish of a kitchen that has dishes. */
  noMatchingDishes: boolean;
};

export type CustomerListOptions = {
  now: Date;
  locale: Locale;
  type?: KitchenType;
  pureVeg?: boolean;
  openNow?: boolean;
  dishFilter?: DishFilter;
};

/** SQL: the kitchen has at least one available dish of the filtered kind (FR-043). */
function hasMatchingDish(filter: DishFilter): SQL | undefined {
  if (filter === 'all') return undefined;
  return sql`exists (select 1 from dishes d where d.kitchen_id = ${kitchens.id} and d.available and d.is_veg = ${filter === 'veg'})`;
}

const stateRank: Record<KitchenState['kind'], number> = { open: 0, closed: 1, hoursNotSet: 2, temporarilyClosed: 3 };

function sortForCustomer(list: KitchenSummary[], locale: Locale): KitchenSummary[] {
  const collator = new Intl.Collator(intlTag[locale]);
  const label = (k: KitchenSummary) => pickLocalized(k.name, locale)?.text ?? '';
  return [...list].sort(
    (a, b) => stateRank[a.state.kind] - stateRank[b.state.kind] || collator.compare(label(a), label(b)),
  );
}

/**
 * Active kitchens with their current state: open first, then by name in the selected language
 * (FR-039), narrowed by kitchen filters (FR-042) and the dish filter (FR-043).
 */
export async function listKitchensForCustomer(options: CustomerListOptions): Promise<KitchenSummary[]> {
  const conditions = [eq(kitchens.status, 'active')];
  if (options.type) conditions.push(eq(kitchens.type, options.type));
  if (options.pureVeg) conditions.push(eq(kitchens.pureVeg, true));
  const dishCondition = hasMatchingDish(options.dishFilter ?? 'all');
  if (dishCondition) conditions.push(dishCondition);

  const rows = await db.select().from(kitchens).where(and(...conditions));
  const list = await summarise(rows, options.now);
  const visible = options.openNow ? list.filter((k) => k.state.kind === 'open') : list;
  return sortForCustomer(visible, options.locale);
}

async function summarise(rows: (typeof kitchens.$inferSelect)[], now: Date): Promise<KitchenSummary[]> {
  const hours = await loadWeekHours(rows.map((k) => k.id));
  return rows.map((k) => ({
    id: k.id,
    name: { en: k.nameEn, kn: k.nameKn },
    type: k.type,
    pureVeg: k.pureVeg,
    photoImageId: k.photoImageId,
    landmark: k.landmark,
    state: kitchenState({ closedAt: k.closedAt, reopensAt: k.reopensAt }, hours.get(k.id)!, now),
  }));
}

/** A kitchen page for customers; null unless the kitchen is active (FR-023, FR-041). */
export async function getKitchenForCustomer(
  id: string,
  options: { now: Date; dishFilter?: DishFilter },
): Promise<KitchenDetail | null> {
  const [k] = await db
    .select()
    .from(kitchens)
    .where(and(eq(kitchens.id, id), eq(kitchens.status, 'active')));
  if (!k) return null;

  const [hours, contacts, categories] = await Promise.all([
    loadWeekHours([k.id]),
    db
      .select({ phone: kitchenContacts.phone, isPrimary: kitchenContacts.isPrimary, position: kitchenContacts.position })
      .from(kitchenContacts)
      .where(eq(kitchenContacts.kitchenId, k.id)),
    db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.kitchenId, k.id))
      .orderBy(asc(menuCategories.position), asc(menuCategories.nameEn)),
  ]);
  const dishRows =
    categories.length === 0
      ? []
      : await db
          .select()
          .from(dishes)
          .where(inArray(dishes.categoryId, categories.map((c) => c.id)))
          .orderBy(asc(dishes.position), asc(dishes.nameEn));

  const week = hours.get(k.id)!;
  const allCategories: CategoryView[] = categories.map((c) => ({
    id: c.id,
    name: { en: c.nameEn, kn: c.nameKn },
    dishes: dishRows
      .filter((d) => d.categoryId === c.id)
      .map((d) => ({
        id: d.id,
        name: { en: d.nameEn, kn: d.nameKn },
        description: { en: d.descriptionEn, kn: d.descriptionKn },
        priceRupees: d.priceRupees,
        isVeg: d.isVeg,
        available: d.available,
        photoImageId: d.photoImageId,
      })),
  }));
  const shown = filterMenu(allCategories, options.dishFilter ?? 'all');
  return {
    id: k.id,
    name: { en: k.nameEn, kn: k.nameKn },
    description: { en: k.descriptionEn, kn: k.descriptionKn },
    type: k.type,
    pureVeg: k.pureVeg,
    photoImageId: k.photoImageId,
    landmark: k.landmark,
    address: k.address,
    state: kitchenState({ closedAt: k.closedAt, reopensAt: k.reopensAt }, week, options.now),
    hours: week,
    contacts: contacts
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.position - b.position)
      .map(({ phone, isPrimary }) => ({ phone, isPrimary })),
    categories: shown,
    noMatchingDishes: shown.length === 0 && dishRows.length > 0,
  };
}

export type DishSearchHit = { dish: DishView; kitchen: { id: string; name: LocalizedPair } };
export type SearchResults = { q: string; kitchens: KitchenSummary[]; dishes: DishSearchHit[] };

/**
 * Search kitchen and dish names in either language, whatever the interface language (FR-044).
 * Substring match, case-insensitive, active kitchens only; the dish filter applies to both lists.
 * Returns null for queries shorter than 2 characters.
 */
export async function searchForCustomer(options: {
  q: string;
  dishFilter: DishFilter;
  now: Date;
  locale: Locale;
}): Promise<SearchResults | null> {
  const q = options.q.normalize('NFC').trim();
  if ([...q].length < 2) return null;
  const pattern = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

  const kitchenConditions = [
    eq(kitchens.status, 'active'),
    or(sql`${kitchens.nameEn} ilike ${pattern}`, sql`${kitchens.nameKn} ilike ${pattern}`)!,
  ];
  const dishCondition = hasMatchingDish(options.dishFilter);
  if (dishCondition) kitchenConditions.push(dishCondition);
  const kitchenRows = await db.select().from(kitchens).where(and(...kitchenConditions));

  const dishConditions = [
    eq(kitchens.status, 'active'),
    or(sql`${dishes.nameEn} ilike ${pattern}`, sql`${dishes.nameKn} ilike ${pattern}`)!,
  ];
  if (options.dishFilter !== 'all') dishConditions.push(eq(dishes.isVeg, options.dishFilter === 'veg'));
  const dishRows = await db
    .select({ dish: dishes, kitchenId: kitchens.id, kitchenNameEn: kitchens.nameEn, kitchenNameKn: kitchens.nameKn })
    .from(dishes)
    .innerJoin(kitchens, eq(kitchens.id, dishes.kitchenId))
    .where(and(...dishConditions))
    .orderBy(asc(dishes.nameEn));

  return {
    q,
    kitchens: sortForCustomer(await summarise(kitchenRows, options.now), options.locale),
    dishes: dishRows.map((r) => ({
      kitchen: { id: r.kitchenId, name: { en: r.kitchenNameEn, kn: r.kitchenNameKn } },
      dish: {
        id: r.dish.id,
        name: { en: r.dish.nameEn, kn: r.dish.nameKn },
        description: { en: r.dish.descriptionEn, kn: r.dish.descriptionKn },
        priceRupees: r.dish.priceRupees,
        isVeg: r.dish.isVeg,
        available: r.dish.available,
        photoImageId: r.dish.photoImageId,
      },
    })),
  };
}
