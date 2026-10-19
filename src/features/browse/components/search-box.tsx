'use client';

import { ArrowRight, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import type { Suggestions } from '../suggestions';
import { filtersToQuery, type KitchenFilters } from './filter-bar';
import { SearchSuggestions } from './search-suggestions';

const DEBOUNCE_MS = 150;

/**
 * Search kitchens and dishes in either language (FR-044) from the home screen. A plain GET form to
 * `/` that carries the kitchen filters, so the query and filters stay in the URL and it works
 * without JavaScript. While typing (from the second letter) it suggests kitchens and dishes from
 * the same search (FR-012, research R7). The clear control drops the query and keeps the filters.
 */
export function SearchBox({ filters }: { filters: KitchenFilters }) {
  const t = useTranslations('search');
  const query = filters.q ?? '';
  const [value, setValue] = useState(query);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const request = useRef<AbortController | null>(null);

  function close() {
    clearTimeout(timer.current);
    request.current?.abort();
    setSuggestions(null);
  }

  function onType(next: string) {
    setValue(next);
    clearTimeout(timer.current);
    request.current?.abort();
    const q = next.trim();
    if ([...q].length < 2) {
      setSuggestions(null);
      return;
    }
    timer.current = setTimeout(async () => {
      const controller = new AbortController();
      request.current = controller;
      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (response.ok) setSuggestions((await response.json()) as Suggestions);
      } catch {
        // Aborted or offline: typing goes on, and the normal search still works.
      }
    }, DEBOUNCE_MS);
  }

  return (
    <form action="/" method="get" role="search" className="relative flex flex-col" onKeyDown={(e) => e.key === 'Escape' && close()}>
      {filters.type ? <input type="hidden" name="type" value={filters.type} /> : null}
      {filters.pureVeg ? <input type="hidden" name="pureVeg" value="1" /> : null}
      {filters.openNow ? <input type="hidden" name="open" value="1" /> : null}
      <label htmlFor="search-q" className="sr-only">
        {t('label')}
      </label>
      {/* A 44 px field; the input inside is 48 px tall (borderless), so the tap target stays 48 px. */}
      <div className="flex h-11 items-center rounded-md border border-line-strong/60 bg-surface shadow-1 focus-within:border-sea focus-within:shadow-[0_0_0_3px_var(--color-sea-soft)]">
        <Search aria-hidden="true" className="ms-3 size-[18px] shrink-0 text-muted" />
        <input
          id="search-q"
          name="q"
          type="search"
          value={value}
          onChange={(e) => onType(e.target.value)}
          maxLength={80}
          autoComplete="off"
          placeholder={t('placeholder')}
          aria-describedby="search-suggestions-status"
          className="-my-0.5 h-12 min-w-0 flex-1 bg-transparent px-2 text-input text-ink placeholder:text-subtle focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {query ? (
          <Link href={filtersToQuery({ ...filters, q: undefined })} aria-label={t('clear')} className="tap grid size-9 shrink-0 place-items-center text-muted">
            <X aria-hidden="true" className="size-[18px]" />
          </Link>
        ) : null}
        <button type="submit" aria-label={t('submit')} className="tap me-1 grid size-9 shrink-0 place-items-center rounded-sm bg-primary text-on-primary">
          <ArrowRight aria-hidden="true" className="size-[18px]" />
        </button>
      </div>
      <SearchSuggestions suggestions={value.trim().length >= 2 ? suggestions : null} q={value.trim()} />
    </form>
  );
}
