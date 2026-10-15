import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { KitchenType } from '../queries';

export type KitchenFilters = { type?: KitchenType; pureVeg?: boolean; openNow?: boolean };

export function filtersToQuery(filters: KitchenFilters): string {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.pureVeg) params.set('pureVeg', '1');
  if (filters.openNow) params.set('open', '1');
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

/** Kitchen type, pure veg and open-now filters as links, so results can be shared (FR-042). */
export function FilterBar({ filters }: { filters: KitchenFilters }) {
  const t = useTranslations();
  const chip = (label: string, active: boolean, next: KitchenFilters, testId: string) => (
    <Link
      key={testId}
      href={filtersToQuery(next)}
      data-testid={testId}
      data-active={active}
      aria-label={active ? `${label} (${t('filters.selected')})` : label}
      className={`inline-flex min-h-touch items-center gap-1 rounded-full border px-4 text-sm ${
        active ? 'border-primary bg-primary font-bold text-on-primary' : 'border-line bg-surface text-ink'
      }`}
    >
      {active ? <span aria-hidden="true">✓</span> : null}
      {label}
    </Link>
  );
  return (
    <nav aria-label={t('filters.label')} className="-mx-4 overflow-x-auto px-4">
      <div className="flex w-max gap-2">
        {(['restaurant', 'home_kitchen', 'cloud_kitchen'] as const).map((type) =>
          chip(t(`kitchenType.${type}`), filters.type === type, { ...filters, type: filters.type === type ? undefined : type }, `filter-${type}`),
        )}
        {chip(t('filters.pureVeg'), Boolean(filters.pureVeg), { ...filters, pureVeg: !filters.pureVeg }, 'filter-pure-veg')}
        {chip(t('filters.openNow'), Boolean(filters.openNow), { ...filters, openNow: !filters.openNow }, 'filter-open-now')}
      </div>
    </nav>
  );
}
