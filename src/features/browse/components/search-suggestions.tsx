'use client';

import { ArrowRight, Search } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { isLocale } from '@/shared/i18n/config';
import { formatPrice } from '@/shared/i18n/format';
import { pickLocalized, type LocalizedPair } from '@/shared/i18n/localized';
import { LocalizedText } from '@/shared/ui/localized-text';
import { Photo } from '@/shared/ui/photo';
import { VegMark } from '@/shared/ui/veg-mark';
import type { Suggestions } from '../suggestions';

/**
 * Kitchens and dishes under the search box (FR-012). A kitchen opens its page; a dish opens its
 * kitchen at that dish. A list of links, not a combobox, so the box keeps its searchbox role.
 */
export function SearchSuggestions({ suggestions, q }: { suggestions: Suggestions | null; q: string }) {
  const t = useTranslations();
  const current = useLocale();
  const locale = isLocale(current) ? current : 'en';
  const name = (pair: LocalizedPair) => pickLocalized(pair, locale)?.text ?? '';
  const status = suggestions ? t('search.suggestionsCount', { kitchens: suggestions.total.kitchens, dishes: suggestions.total.dishes }) : '';
  const empty = suggestions && suggestions.kitchens.length === 0 && suggestions.dishes.length === 0;
  const heading = 'px-4 pb-1 pt-3 text-caption font-bold uppercase tracking-wide text-subtle';
  const row = 'flex min-h-touch items-center gap-3 px-4 py-2 hover:bg-surface-sunk focus-visible:bg-surface-sunk focus-visible:outline-none';
  return (
    <>
      <p id="search-suggestions-status" role="status" aria-live="polite" className="sr-only">
        {status}
      </p>
      {suggestions ? (
        <div
          data-testid="search-suggestions"
          className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-[60vh] animate-drop-in overflow-y-auto rounded-lg border border-line-strong/40 bg-surface pb-1 shadow-3"
        >
          {empty ? (
            <p data-testid="search-no-matches" className="px-4 py-4 text-base text-muted">
              {t('search.noResultsTitle', { q })}
            </p>
          ) : (
            <>
              {suggestions.kitchens.length > 0 ? (
                <>
                  <p className={heading}>{t('search.kitchens')}</p>
                  <ul>
                    {suggestions.kitchens.map((k) => (
                      <li key={k.id}>
                        <Link href={`/kitchens/${k.id}`} className={row}>
                          <Photo imageId={k.photoImageId} alt="" placeholder={k.type} sizes="40px" className="size-10 shrink-0 rounded-sm" />
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-base font-bold" data-truncate title={name(k.name)}>
                              <LocalizedText pair={k.name} />
                            </span>
                            <span className="text-caption text-muted">
                              {t(`kitchenType.${k.type}`)}
                              {k.state.kind === 'open' ? ` · ${t('kitchenState.open')}` : ''}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {suggestions.dishes.length > 0 ? (
                <>
                  <p className={heading}>{t('search.dishes')}</p>
                  <ul>
                    {suggestions.dishes.map((d) => (
                      <li key={d.id}>
                        <Link href={`/kitchens/${d.kitchen.id}#dish-${d.id}`} className={row}>
                          <Photo imageId={d.photoImageId} alt="" placeholder={d.isVeg ? 'veg' : 'nonveg'} sizes="40px" className="size-10 shrink-0 rounded-sm" />
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="flex items-center gap-1.5 text-base font-bold">
                              <VegMark isVeg={d.isVeg} showLabel={false} />
                              <span className="truncate" data-truncate title={name(d.name)}>
                                <LocalizedText pair={d.name} />
                              </span>
                            </span>
                            <span className="truncate text-caption text-muted" data-truncate title={name(d.kitchen.name)}>
                              <LocalizedText pair={d.kitchen.name} />
                            </span>
                          </span>
                          <span className="shrink-0 text-base font-bold">{formatPrice(d.priceRupees, locale)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              <button type="submit" className={`${row} w-full border-t border-line font-semibold text-primary-strong`}>
                <Search aria-hidden="true" className="size-5 shrink-0" />
                <span className="flex-1 text-start">{t('search.allResultsFor', { q })}</span>
                <ArrowRight aria-hidden="true" className="size-5 shrink-0" />
              </button>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
