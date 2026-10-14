'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { safeNext } from '../auth/surfaces';
import { DISH_FILTER_COOKIE } from './dish-filter-cookie';

const ONE_YEAR = 60 * 60 * 24 * 365;
const schema = z.object({ filter: z.enum(['all', 'veg', 'nonveg']) });

/** Set the dish filter (a plain form post, no client JS) and return to the page it was changed on. */
export async function setDishFilter(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({ filter: formData.get('filter') });
  const returnTo = safeNext('customer', String(formData.get('returnTo') ?? '/'));
  if (parsed.success) {
    (await cookies()).set(DISH_FILTER_COOKIE, parsed.data.filter, { path: '/', maxAge: ONE_YEAR, sameSite: 'lax' });
  }
  redirect(returnTo);
}
