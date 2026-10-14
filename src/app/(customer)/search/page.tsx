import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { DishFilterControl } from '@/features/browse/components/dish-filter-control';
import { DishRow } from '@/features/browse/components/dish-row';
import { KitchenCard } from '@/features/browse/components/kitchen-card';
import { SearchBox } from '@/features/browse/components/search-box';
import { readDishFilter } from '@/features/browse/dish-filter-cookie';
import { searchForCustomer } from '@/features/browse/queries';
import { isLocale } from '@/shared/i18n/config';
import { EmptyState } from '@/shared/ui/empty-state';
import { LocalizedText } from '@/shared/ui/localized-text';

type Props = { searchParams: Promise<{ q?: string | string[] }> };

export default async function SearchPage({ searchParams }: Props) {
  const t = await getTranslations('search');
  const current = await getLocale();
  const raw = (await searchParams).q;
  const q = typeof raw === 'string' ? raw.slice(0, 80) : '';
  const dishFilter = await readDishFilter();
  const now = new Date();
  const results = await searchForCustomer({ q, dishFilter, now, locale: isLocale(current) ? current : 'en' });
  const returnTo = `/search?q=${encodeURIComponent(q)}`;
  const empty = results && results.kitchens.length === 0 && results.dishes.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <SearchBox defaultValue={q} />
      <DishFilterControl current={dishFilter} returnTo={returnTo} />
      {!results ? (
        <p className="text-base text-muted">{t('tooShort')}</p>
      ) : empty ? (
        <EmptyState title={t('noResultsTitle', { q: results.q })} body={t('noResultsBody')} />
      ) : (
        <>
          <p className="text-base text-muted">{t('resultsFor', { q: results.q })}</p>
          {results.kitchens.length > 0 ? (
            <section aria-labelledby="kitchen-results" className="flex flex-col gap-2">
              <h2 id="kitchen-results" className="text-lg font-bold">
                {t('kitchens')}
              </h2>
              <ul className="flex flex-col gap-3">
                {results.kitchens.map((kitchen) => (
                  <KitchenCard key={kitchen.id} kitchen={kitchen} now={now} />
                ))}
              </ul>
            </section>
          ) : null}
          {results.dishes.length > 0 ? (
            <section aria-labelledby="dish-results" className="flex flex-col gap-2">
              <h2 id="dish-results" className="text-lg font-bold">
                {t('dishes')}
              </h2>
              <ul className="flex flex-col gap-2">
                {results.dishes.map(({ dish, kitchen }) => (
                  <li key={dish.id} data-testid="dish-result" className="rounded-2xl border border-line bg-surface px-3">
                    <Link href={`/kitchens/${kitchen.id}`} className="block pt-2 text-sm font-semibold text-primary">
                      <LocalizedText pair={kitchen.name} />
                    </Link>
                    <ul>
                      <DishRow dish={dish} />
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
