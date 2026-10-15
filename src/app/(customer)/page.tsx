import { getLocale, getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { ClearFilters } from '@/features/browse/components/clear-filters';
import { DishFilterControl } from '@/features/browse/components/dish-filter-control';
import { FilterBar, filtersToQuery, type KitchenFilters } from '@/features/browse/components/filter-bar';
import { KitchenCard } from '@/features/browse/components/kitchen-card';
import { SearchBox } from '@/features/browse/components/search-box';
import { SearchResults } from '@/features/browse/components/search-results';
import { readDishFilter } from '@/features/browse/dish-filter-cookie';
import { listKitchensForCustomer, searchForCustomer } from '@/features/browse/queries';
import { isLocale } from '@/shared/i18n/config';
import { EmptyState } from '@/shared/ui/empty-state';
import { CustomerDock } from '@/features/cart/components/customer-dock';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Invalid filter values are ignored rather than shown as errors. */
const filtersSchema = z.object({
  type: z.enum(['restaurant', 'home_kitchen', 'cloud_kitchen']).optional().catch(undefined),
  pureVeg: z.literal('1').optional().catch(undefined),
  open: z.literal('1').optional().catch(undefined),
  /** Search text: trimmed, at most 80 characters; anything else is no search. */
  q: z.string().trim().max(80).optional().catch(undefined),
});

export default async function HomePage({ searchParams }: Props) {
  const t = await getTranslations();
  const current = await getLocale();
  const raw = filtersSchema.parse(await searchParams);
  const filters: KitchenFilters = { type: raw.type, pureVeg: raw.pureVeg === '1', openNow: raw.open === '1', q: raw.q || undefined };
  const dishFilter = await readDishFilter();
  const now = new Date();
  const locale = isLocale(current) ? current : 'en';
  // A search shows results on the home screen; the kitchen filters stay in the URL for when it is cleared.
  const results = filters.q ? await searchForCustomer({ q: filters.q, dishFilter, now, locale }) : null;
  const kitchens = await listKitchensForCustomer({
    now,
    locale: isLocale(current) ? current : 'en',
    ...filters,
    dishFilter,
  });
  const anyFilter = Boolean(filters.type || filters.pureVeg || filters.openNow || dishFilter !== 'all');

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t('home.title')}</h1>
      <SearchBox filters={filters} />
      {filters.q ? null : <FilterBar filters={filters} />}
      <DishFilterControl current={dishFilter} returnTo={filtersToQuery(filters)} />
      {filters.q ? (
        results ? (
          <SearchResults results={results} now={now} />
        ) : (
          <p className="text-base text-muted">{t('search.tooShort')}</p>
        )
      ) : kitchens.length === 0 ? (
        <EmptyState
          title={anyFilter ? t('filters.noResultsTitle') : t('home.emptyTitle')}
          body={
            filters.pureVeg && dishFilter === 'nonveg'
              ? t('filters.pureVegNonVeg')
              : anyFilter
                ? t('filters.noResultsBody')
                : t('home.emptyBody')
          }
          action={anyFilter ? <ClearFilters /> : undefined}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {kitchens.map((kitchen, index) => (
            <KitchenCard key={kitchen.id} kitchen={kitchen} now={now} priority={index < 2} />
          ))}
        </ul>
      )}
      <CustomerDock showCart />
    </div>
  );
}
