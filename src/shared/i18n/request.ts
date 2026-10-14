import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { env } from '../env';
import { isLocale, LOCALE_COOKIE, type Locale } from './config';

/** The active locale: the visitor's remembered choice, else the deployment default (FR-014, FR-015). */
export async function resolveLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(fromCookie) ? fromCookie : env.DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  const messages = (await import(`./messages/${locale}.json`)).default;
  return { locale, messages, timeZone: 'Asia/Kolkata' };
});
