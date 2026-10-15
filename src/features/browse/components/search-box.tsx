import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/shared/ui/button';

/** Search kitchens and dishes in either language (FR-044). A plain GET form. */
export function SearchBox({ defaultValue = '' }: { defaultValue?: string }) {
  const t = useTranslations('search');
  return (
    <form action="/search" method="get" role="search" className="flex gap-2">
      <label htmlFor="search-q" className="sr-only">
        {t('label')}
      </label>
      <input
        id="search-q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={t('placeholder')}
        className="min-h-touch min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-base"
      />
      <button type="submit" className={buttonClasses('primary', 'px-4')}>
        {t('submit')}
      </button>
    </form>
  );
}
