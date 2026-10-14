import type { Locale } from './config';

export type LocalizedPair = { en?: string | null; kn?: string | null };
export type LocalizedValue = { text: string; lang: Locale; isFallback: boolean };

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Partner-authored content is stored as a language pair. Show the selected language, or fall back
 * to the other one with `isFallback` so the UI can show a visible marker (FR-017).
 */
export function pickLocalized(pair: LocalizedPair, locale: Locale): LocalizedValue | null {
  const other: Locale = locale === 'en' ? 'kn' : 'en';
  const own = clean(pair[locale]);
  if (own) return { text: own, lang: locale, isFallback: false };
  const fallback = clean(pair[other]);
  if (fallback) return { text: fallback, lang: other, isFallback: true };
  return null;
}
