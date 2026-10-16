import { Clock, Cloud, House, Store } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { ChipLink } from '@/shared/ui/chip';
import { VegMarkIcon } from '@/shared/ui/icons/veg-marks';
import type { KitchenType } from '../queries';

/** Kitchen filters and the search query, all kept in the home URL (FR-042, FR-044). */
export type KitchenFilters = { type?: KitchenType; pureVeg?: boolean; openNow?: boolean; q?: string };

export function filtersToQuery(filters: KitchenFilters): string {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.pureVeg) params.set('pureVeg', '1');
  if (filters.openNow) params.set('open', '1');
  if (filters.q) params.set('q', filters.q);
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

const typeIcons = { restaurant: Store, home_kitchen: House, cloud_kitchen: Cloud } as const;

/** Open-now, pure veg and kitchen type filters as chip links, so results can be shared (FR-042). */
export function FilterBar({ filters }: { filters: KitchenFilters }) {
  const t = useTranslations();
  const chip = (label: string, active: boolean, next: KitchenFilters, testId: string, icon: ReactNode) => (
    <ChipLink key={testId} href={filtersToQuery(next)} pressed={active} icon={icon} testId={testId}>
      {label}
      {active ? <span className="sr-only"> ({t('filters.selected')})</span> : null}
    </ChipLink>
  );
  return (
    <nav aria-label={t('filters.label')} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
      <div className="flex w-max gap-1.5">
        {chip(t('filters.openNow'), Boolean(filters.openNow), { ...filters, openNow: !filters.openNow }, 'filter-open-now', <Clock aria-hidden="true" />)}
        {chip(t('filters.pureVeg'), Boolean(filters.pureVeg), { ...filters, pureVeg: !filters.pureVeg }, 'filter-pure-veg', <VegMarkIcon />)}
        {(['restaurant', 'home_kitchen', 'cloud_kitchen'] as const).map((type) => {
          const Icon = typeIcons[type];
          return chip(
            t(`kitchenType.${type}`),
            filters.type === type,
            { ...filters, type: filters.type === type ? undefined : type },
            `filter-${type}`,
            <Icon aria-hidden="true" />,
          );
        })}
      </div>
    </nav>
  );
}
