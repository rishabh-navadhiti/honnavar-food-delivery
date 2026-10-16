import { Store } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { EmptyState } from '@/shared/ui/empty-state';
import { LocalizedText } from '@/shared/ui/localized-text';
import type { SearchResults as Results } from '../queries';
import { DishRow } from './dish-row';
import { KitchenCard } from './kitchen-card';

/** Kitchen and dish matches for a search (FR-044), shown on the home screen. */
export function SearchResults({ results, now }: { results: Results; now: Date }) {
  const t = useTranslations('search');
  if (results.kitchens.length === 0 && results.dishes.length === 0) {
    return <EmptyState illustration="NoKitchens" title={t('noResultsTitle', { q: results.q })} body={t('noResultsBody')} />;
  }
  return (
    <>
      <p className="text-base font-semibold text-muted">{t('resultsFor', { q: results.q })}</p>
      {results.kitchens.length > 0 ? (
        <section aria-labelledby="kitchen-results" className="flex flex-col gap-2">
          <h2 id="kitchen-results" className="text-heading font-bold">
            {t('kitchens')}
          </h2>
          <ul className="flex flex-col rounded-lg bg-surface px-3 shadow-1">
            {results.kitchens.map((kitchen) => (
              <KitchenCard key={kitchen.id} kitchen={kitchen} now={now} />
            ))}
          </ul>
        </section>
      ) : null}
      {results.dishes.length > 0 ? (
        <section aria-labelledby="dish-results" className="flex flex-col gap-2">
          <h2 id="dish-results" className="text-heading font-bold">
            {t('dishes')}
          </h2>
          <ul className="flex flex-col gap-2">
            {results.dishes.map(({ dish, kitchen }) => (
              <li key={dish.id} data-testid="dish-result" className="rounded-lg bg-surface px-3 shadow-1">
                <Link href={`/kitchens/${kitchen.id}`} className="tap flex items-center gap-1.5 py-1.5 text-small font-semibold text-primary-strong">
                  <Store aria-hidden="true" className="size-4 shrink-0" />
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
  );
}
