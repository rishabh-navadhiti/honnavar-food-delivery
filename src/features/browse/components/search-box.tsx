import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/shared/ui/button';
import { filtersToQuery, type KitchenFilters } from './filter-bar';

/**
 * Search kitchens and dishes in either language (FR-044) from the home screen. A plain GET form to
 * `/` that carries the kitchen filters, so the query and filters stay in the URL and the phone's
 * Back button returns to the list. The clear control drops the query and keeps the filters.
 */
export function SearchBox({ filters }: { filters: KitchenFilters }) {
  const t = useTranslations('search');
  const query = filters.q ?? '';
  return (
    <form action="/" method="get" role="search" className="flex gap-2">
      {filters.type ? <input type="hidden" name="type" value={filters.type} /> : null}
      {filters.pureVeg ? <input type="hidden" name="pureVeg" value="1" /> : null}
      {filters.openNow ? <input type="hidden" name="open" value="1" /> : null}
      <label htmlFor="search-q" className="sr-only">
        {t('label')}
      </label>
      <div className="relative min-w-0 flex-1">
        <input
          id="search-q"
          name="q"
          type="search"
          defaultValue={query}
          maxLength={80}
          placeholder={t('placeholder')}
          className={`min-h-touch w-full rounded-xl border border-line bg-surface px-3 text-base ${query ? 'pe-12' : ''} [&::-webkit-search-cancel-button]:hidden`}
        />
        {query ? (
          <Link
            href={filtersToQuery({ ...filters, q: undefined })}
            aria-label={t('clear')}
            className="absolute inset-y-0 end-0 flex w-12 items-center justify-center text-xl text-muted"
          >
            <span aria-hidden="true">×</span>
          </Link>
        ) : null}
      </div>
      <button type="submit" className={buttonClasses('primary', 'px-4')}>
        {t('submit')}
      </button>
    </form>
  );
}
