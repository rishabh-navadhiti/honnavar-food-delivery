export const locales = ['en', 'kn'] as const;
export type Locale = (typeof locales)[number];

export const LOCALE_COOKIE = 'locale';

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'kn';
}

/** BCP 47 tags used for all system formatting (Principle II). */
export const intlTag: Record<Locale, string> = { en: 'en-IN', kn: 'kn-IN' };
