import { useLocale, useTranslations } from 'next-intl';
import { setLocale } from '../i18n/actions';

/** Visible on every screen (FR-012). A plain form post, so it works without client JavaScript. */
export function LanguageSwitch() {
  const t = useTranslations('languageSwitch');
  const current = useLocale();
  const target = current === 'kn' ? 'en' : 'kn';
  return (
    <form action={setLocale}>
      <input type="hidden" name="locale" value={target} />
      <button
        type="submit"
        aria-label={t('ariaLabel')}
        lang={target}
        className="min-h-touch rounded-xl border border-line bg-surface px-3 text-base font-semibold text-ink hover:bg-secondary"
      >
        {t('label')}
      </button>
    </form>
  );
}
