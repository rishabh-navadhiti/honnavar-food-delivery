import 'server-only';
import { cookies } from 'next/headers';
import { parseDishFilter, type DishFilter } from './domain/dish-filter';

export const DISH_FILTER_COOKIE = 'hfd_dish_filter';

/** The visitor's dish filter, remembered on the device until changed (FR-043). */
export async function readDishFilter(): Promise<DishFilter> {
  return parseDishFilter((await cookies()).get(DISH_FILTER_COOKIE)?.value);
}
