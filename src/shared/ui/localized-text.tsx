import { useLocale } from 'next-intl';
import { isLocale } from '../i18n/config';
import { pickLocalized, type LocalizedPair } from '../i18n/localized';
import { FallbackMarker } from './fallback-marker';

/** Renders partner-authored content in the selected language, with a marker when falling back. */
export function LocalizedText({ pair, className }: { pair: LocalizedPair; className?: string }) {
  const current = useLocale();
  const value = pickLocalized(pair, isLocale(current) ? current : 'en');
  if (!value) return null;
  return (
    <span className={className}>
      <span lang={value.lang}>{value.text}</span>
      {value.isFallback ? <FallbackMarker lang={value.lang} /> : null}
    </span>
  );
}
