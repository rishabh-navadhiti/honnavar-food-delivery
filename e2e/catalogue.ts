/**
 * Select e2e test subjects from seed/catalogue.json by flags and keys, never by name, so the tests
 * keep passing when the researched catalogue replaces the stand-in.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { catalogueSchema, type CatalogueDish, type CatalogueKitchen } from '../src/features/demo/catalogue-schema';
import { demoIds } from '../src/features/demo/ids';

const catalogue = catalogueSchema.parse(
  JSON.parse(readFileSync(path.resolve('seed/catalogue.json'), 'utf8')),
);

export type KitchenRef = CatalogueKitchen & { id: string; displayName: string };
export type DishRef = CatalogueDish & { id: string; displayName: string };

function ref(k: CatalogueKitchen): KitchenRef {
  return { ...k, id: demoIds.kitchen(k.key), displayName: k.name.en ?? k.name.kn ?? k.key };
}
function dishRef(k: CatalogueKitchen, d: CatalogueDish): DishRef {
  return { ...d, id: demoIds.dish(k.key, d.key), displayName: d.name.en ?? d.name.kn ?? d.key };
}
function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`seed/catalogue.json has no ${what}; the e2e tests need one.`);
  return value;
}

const allDishes = (k: CatalogueKitchen) => k.categories.flatMap((c) => c.dishes);

export const activeKitchens = (): KitchenRef[] => catalogue.kitchens.filter((k) => k.status === 'active').map(ref);
export const pendingKitchen = (): KitchenRef => ref(must(catalogue.kitchens.find((k) => k.status === 'pending'), 'pending kitchen'));
export const suspendedKitchen = (): KitchenRef =>
  ref(must(catalogue.kitchens.find((k) => k.status === 'suspended'), 'suspended kitchen'));
export const temporarilyClosedKitchen = (): KitchenRef =>
  ref(must(catalogue.kitchens.find((k) => k.status === 'active' && k.temporarilyClosedAtReset), 'temporarily closed kitchen'));

export function kitchenWithHelper(): { kitchen: KitchenRef; ownerPhone: string; helperPhone: string } {
  const k = must(
    catalogue.kitchens.find((x) => x.status === 'active' && !x.temporarilyClosedAtReset && x.signins.length >= 2),
    'active kitchen with two sign-ins',
  );
  return { kitchen: ref(k), ownerPhone: k.signins[0]!.phone, helperPhone: k.signins[1]!.phone };
}

export function dishWithoutKannadaName(): { kitchen: KitchenRef; dish: DishRef } {
  for (const k of catalogue.kitchens.filter((x) => x.status === 'active')) {
    const d = allDishes(k).find((x) => !x.name.kn);
    if (d) return { kitchen: ref(k), dish: dishRef(k, d) };
  }
  throw new Error('seed/catalogue.json has no active dish without a Kannada name.');
}

export function unavailableDish(): { kitchen: KitchenRef; dish: DishRef } {
  for (const k of catalogue.kitchens.filter((x) => x.status === 'active')) {
    const d = allDishes(k).find((x) => !x.available);
    if (d) return { kitchen: ref(k), dish: dishRef(k, d) };
  }
  throw new Error('seed/catalogue.json has no unavailable dish in an active kitchen.');
}

export function availableDishIn(kitchenKey: string): DishRef {
  const k = must(catalogue.kitchens.find((x) => x.key === kitchenKey), `kitchen ${kitchenKey}`);
  return dishRef(k, must(allDishes(k).find((d) => d.available), `available dish in ${kitchenKey}`));
}

export const pureVegKitchen = (): KitchenRef =>
  ref(must(catalogue.kitchens.find((k) => k.status === 'active' && k.pureVeg), 'active pure-veg kitchen'));

export function nonVegKitchen(): KitchenRef {
  return ref(
    must(
      catalogue.kitchens.find(
        (k) =>
          k.status === 'active' &&
          !k.temporarilyClosedAtReset &&
          !k.pureVeg &&
          allDishes(k).some((d) => d.available && d.isVeg) &&
          allDishes(k).some((d) => d.available && !d.isVeg),
      ),
      'active non-veg kitchen with both veg and non-veg dishes',
    ),
  );
}

export function searchableDish(): { kitchen: KitchenRef; dish: DishRef; enTerm: string; knTerm: string } {
  for (const k of catalogue.kitchens.filter((x) => x.status === 'active')) {
    for (const d of allDishes(k)) {
      const enTerm = d.name.en?.split(/\s+/)[0];
      const knTerm = d.name.kn?.split(/\s+/)[0];
      if (d.available && enTerm && knTerm && enTerm.length >= 2 && knTerm.length >= 2) {
        return { kitchen: ref(k), dish: dishRef(k, d), enTerm, knTerm };
      }
    }
  }
  throw new Error('seed/catalogue.json has no searchable dish with both names.');
}

export function kitchenTypeCounts(): Record<'restaurant' | 'home_kitchen' | 'cloud_kitchen', number> {
  const counts = { restaurant: 0, home_kitchen: 0, cloud_kitchen: 0 };
  for (const k of activeKitchens()) counts[k.type] += 1;
  return counts;
}

export const admin = () => must(catalogue.admins[0], 'admin');
export const activeAgent = () => must(catalogue.agents.find((a) => a.active), 'active agent');
export const inactiveAgent = () => must(catalogue.agents.find((a) => !a.active), 'inactive agent');
export const demoCode = () => process.env.DEMO_OTP_CODE ?? '123456';
