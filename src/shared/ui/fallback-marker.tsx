import { useTranslations } from 'next-intl';
import type { Locale } from '../i18n/config';

/** Visible marker on partner content shown in the other language (FR-017). */
export function FallbackMarker({ lang }: { lang: Locale }) {
  const t = useTranslations('fallback');
  const language = t(lang);
  return (
    <span
      title={t('title', { language })}
      data-testid="fallback-marker"
      className="ms-1.5 inline-flex items-center rounded-xs border border-line bg-surface-sunk px-1.5 align-middle text-caption font-semibold text-muted"
    >
      {language}
    </span>
  );
}
