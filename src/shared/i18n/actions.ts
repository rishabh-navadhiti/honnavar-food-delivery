'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { LOCALE_COOKIE, locales } from './config';

const ONE_YEAR = 60 * 60 * 24 * 365;
const schema = z.object({ locale: z.enum(locales) });

/** Remember the visitor's language on this device (FR-015). Works as a plain form post. */
export async function setLocale(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({ locale: formData.get('locale') });
  if (!parsed.success) return;
  (await cookies()).set(LOCALE_COOKIE, parsed.data.locale, {
    path: '/',
    maxAge: ONE_YEAR,
    sameSite: 'lax',
  });
  revalidatePath('/', 'layout');
}
