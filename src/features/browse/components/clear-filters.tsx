import { FilterX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/shared/ui/button';
import { setDishFilter } from '../actions';

/** One tap clears the kitchen filters and resets the dish filter to All. */
export function ClearFilters() {
  const t = useTranslations('filters');
  return (
    <form action={setDishFilter}>
      <input type="hidden" name="filter" value="all" />
      <input type="hidden" name="returnTo" value="/" />
      <button type="submit" className={buttonClasses('secondary')}>
        <FilterX aria-hidden="true" />
        {t('clear')}
      </button>
    </form>
  );
}
