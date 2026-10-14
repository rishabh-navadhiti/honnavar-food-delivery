import { useTranslations } from 'next-intl';
import { setDishFilter } from '../actions';
import { DISH_FILTERS, type DishFilter } from '../domain/dish-filter';

/** Three-state dish filter (FR-043). The active state is shown with a tick and weight, not colour alone. */
export function DishFilterControl({ current, returnTo }: { current: DishFilter; returnTo: string }) {
  const t = useTranslations('dishFilter');
  return (
    <form action={setDishFilter} className="flex flex-col gap-1" data-testid="dish-filter" data-current={current}>
      <input type="hidden" name="returnTo" value={returnTo} />
      <span className="text-sm font-semibold text-muted">{t('label')}</span>
      <div role="group" aria-label={t('label')} className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-surface p-1">
        {DISH_FILTERS.map((filter) => {
          const active = filter === current;
          return (
            <button
              key={filter}
              type="submit"
              name="filter"
              value={filter}
              aria-pressed={active}
              className={`min-h-touch rounded-lg px-2 text-sm ${active ? 'bg-primary font-bold text-on-primary' : 'text-ink hover:bg-secondary'}`}
            >
              {active ? <span aria-hidden="true" className="me-1">✓</span> : null}
              {t(filter)}
            </button>
          );
        })}
      </div>
    </form>
  );
}
