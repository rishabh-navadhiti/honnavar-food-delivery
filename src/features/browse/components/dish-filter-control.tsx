import { useTranslations } from 'next-intl';
import { NonVegMarkIcon, VegMarkIcon } from '@/shared/ui/icons/veg-marks';
import { setDishFilter } from '../actions';
import { DISH_FILTERS, type DishFilter } from '../domain/dish-filter';

const marks: Record<DishFilter, React.ReactNode> = { all: null, veg: <VegMarkIcon />, nonveg: <NonVegMarkIcon /> };

/** Three-state dish filter (FR-043) as a segmented control; the active state is raised and pressed, not colour alone. */
export function DishFilterControl({ current, returnTo }: { current: DishFilter; returnTo: string }) {
  const t = useTranslations('dishFilter');
  return (
    <form action={setDishFilter} className="flex items-center gap-2" data-testid="dish-filter" data-current={current}>
      <input type="hidden" name="returnTo" value={returnTo} />
      <span className="sr-only">{t('label')}</span>
      <div role="group" aria-label={t('label')} className="grid h-10 flex-1 grid-cols-3 gap-0.5 rounded-full bg-line/70 p-0.5">
        {DISH_FILTERS.map((filter) => {
          const active = filter === current;
          return (
            <button
              key={filter}
              type="submit"
              name="filter"
              value={filter}
              aria-pressed={active}
              className={`tap stretch-dense inline-flex h-9 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-full px-1.5 text-sm transition-colors duration-(--duration-fast) ${
                active ? 'bg-surface font-bold text-ink shadow-1' : 'font-semibold text-muted'
              }`}
            >
              {marks[filter]}
              {t(filter)}
            </button>
          );
        })}
      </div>
    </form>
  );
}
