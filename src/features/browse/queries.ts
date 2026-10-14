import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { dishes, kitchenContacts, kitchens, menuCategories } from '@/shared/db/schema';
import { intlTag, type Locale } from '@/shared/i18n/config';
import { pickLocalized, type LocalizedPair } from '@/shared/i18n/localized';
import type { WeekHours } from '../kitchens/domain/hours';
import { kitchenState, type KitchenState } from '../kitchens/domain/state';
import { loadWeekHours } from '../kitchens/queries';

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
};

const stateRank: Record<KitchenState['kind'], number> = { open: 0, closed: 1, hoursNotSet: 2, temporarilyClosed: 3 };

function sortForCustomer(list: KitchenSummary[], locale: Locale): KitchenSummary[] {
  const collator = new Intl.Collator(intlTag[locale]);
  const label = (k: KitchenSummary) => pickLocalized(k.name, locale)?.text ?? '';
  return [...list].sort(
    (a, b) => stateRank[a.state.kind] - stateRank[b.state.kind] || collator.compare(label(a), label(b)),
  );
}

/** Active kitchens with their current state: open first, then by name in the selected language (FR-039). */
export async function listKitchensForCustomer(options: { now: Date; locale: Locale }): Promise<KitchenSummary[]> {
  const rows = await db.select().from(kitchens).where(eq(kitchens.status, 'active'));
  const hours = await loadWeekHours(rows.map((k) => k.id));
  const list = rows.map((k) => ({
    id: k.id,
    name: { en: k.nameEn, kn: k.nameKn },
    type: k.type,
    pureVeg: k.pureVeg,
    photoImageId: k.photoImageId,
    landmark: k.landmark,
    state: kitchenState({ closedAt: k.closedAt, reopensAt: k.reopensAt }, hours.get(k.id)!, options.now),
  }));
  return sortForCustomer(list, options.locale);
}

/** A kitchen page for customers; null unless the kitchen is active (FR-023, FR-041). */
export async function getKitchenForCustomer(id: string, options: { now: Date }): Promise<KitchenDetail | null> {
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
    categories: categories.map((c) => ({
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
    })),
  };
}
