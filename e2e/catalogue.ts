/**
 * Select e2e test subjects from seed/catalogue.json by flags and keys, never by name, so the tests
 * keep passing when the researched catalogue replaces the stand-in.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { catalogueSchema, type Catalogue, type CatalogueDish, type CatalogueKitchen } from '../src/features/demo/catalogue-schema';
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

// --- Ordering (002): seeded orders and orderable kitchens, selected by flags, never by name ---

export type OrderRef = {
  key: string;
  id: string;
  orderNo: number;
  status: string;
  payment: 'cod' | 'upi_demo';
  kitchen: KitchenRef;
  agent?: { key: string; id: string; name: string; phone: string };
  reason?: string;
};

function orderRef(index: number): OrderRef {
  const o = catalogue.orders[index]!;
  const kitchen = must(catalogue.kitchens.find((k) => k.key === o.kitchen), `kitchen ${o.kitchen}`);
  const agent = o.agent ? must(catalogue.agents.find((a) => a.key === o.agent), `agent ${o.agent}`) : undefined;
  return {
    key: o.key,
    id: demoIds.order(o.key),
    // The reset recreates order_number_seq, so seeded orders are numbered 1001+ in catalogue order.
    orderNo: 1001 + index,
    status: o.status,
    payment: o.payment,
    kitchen: ref(kitchen),
    agent: agent ? { key: agent.key, id: demoIds.agent(agent.key), name: agent.name, phone: agent.phone } : undefined,
    reason: o.reason,
  };
}

function findOrder(what: string, pred: (o: Catalogue['orders'][number]) => boolean): OrderRef {
  const index = catalogue.orders.findIndex(pred);
  if (index < 0) throw new Error(`seed/catalogue.json has no ${what}; the e2e tests need one.`);
  return orderRef(index);
}

export const placedOrder = () => findOrder('Placed order', (o) => o.status === 'placed');
export const needsAgentOrder = () => findOrder('accepted order without an agent', (o) => o.status === 'accepted' && !o.agent);
export const readyOrder = () => findOrder('Ready order with an agent', (o) => o.status === 'ready' && Boolean(o.agent));
export const outOrder = () => findOrder('Picked up order', (o) => o.status === 'picked_up');
export const deliveredOrder = () => findOrder('delivered cash order', (o) => o.status === 'delivered' && o.payment === 'cod');
export const rejectedOrder = () => findOrder('Rejected order', (o) => o.status === 'rejected');
export const cancelledOrder = () => findOrder('Cancelled order', (o) => o.status === 'cancelled');

export const demoCustomer = () => {
  const c = must(catalogue.customers.find((x) => x.addresses.length > 0), 'customer with addresses');
  return { ...c, id: demoIds.customer(c.key) };
};

function orderable(k: CatalogueKitchen): boolean {
  return k.status === 'active' && !k.temporarilyClosedAtReset && allDishes(k).filter((d) => d.available).length >= 2;
}

/** An active kitchen with at least two available dishes (e2e opens it all day with `openAllDay`). */
export const orderableKitchen = (): KitchenRef => ref(must(catalogue.kitchens.find(orderable), 'orderable kitchen'));
export const secondOrderableKitchen = (): KitchenRef =>
  ref(must(catalogue.kitchens.filter(orderable)[1], 'second orderable kitchen'));

export const availableDishesIn = (kitchenKey: string): DishRef[] => {
  const k = must(catalogue.kitchens.find((x) => x.key === kitchenKey), `kitchen ${kitchenKey}`);
  return allDishes(k)
    .filter((d) => d.available)
    .map((d) => dishRef(k, d));
};

export const activeAgents = () => catalogue.agents.filter((a) => a.active).map((a) => ({ ...a, id: demoIds.agent(a.key) }));
