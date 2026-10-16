import { Languages } from 'lucide-react';
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
      <button type="submit" aria-label={t('ariaLabel')} lang={target} className="inline-flex min-h-touch min-w-touch items-center justify-center">
        <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong/45 bg-surface px-3 text-[0.94rem] font-semibold text-ink shadow-1 hover:bg-surface-sunk">
          <Languages aria-hidden="true" className="size-4 text-primary" />
          {t('label')}
        </span>
      </button>
    </form>
  );
}
