/** The customer's dish filter (FR-043): All, Veg only or Non-veg only. */
export type DishFilter = 'all' | 'veg' | 'nonveg';
export const DISH_FILTERS: readonly DishFilter[] = ['all', 'veg', 'nonveg'];

export function parseDishFilter(value: unknown): DishFilter {
  return value === 'veg' || value === 'nonveg' ? value : 'all';
}

export function dishMatches(dish: { isVeg: boolean }, filter: DishFilter): boolean {
  if (filter === 'all') return true;
  return filter === 'veg' ? dish.isVeg : !dish.isVeg;
}

/** With Veg only / Non-veg only, a kitchen shows only if it has an available dish of that kind. */
export function kitchenMatchesDishFilter(dishes: { isVeg: boolean; available: boolean }[], filter: DishFilter): boolean {
  if (filter === 'all') return true;
  return dishes.some((d) => d.available && dishMatches(d, filter));
}

/** Matching dishes only (unavailable ones stay, flagged by the UI); empty categories are dropped. */
export function filterMenu<D extends { isVeg: boolean }, C extends { dishes: D[] }>(categories: C[], filter: DishFilter): C[] {
  return categories
    .map((c) => ({ ...c, dishes: c.dishes.filter((d) => dishMatches(d, filter)) }))
    .filter((c) => c.dishes.length > 0);
}
