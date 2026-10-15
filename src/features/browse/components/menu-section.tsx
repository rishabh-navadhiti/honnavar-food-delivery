import type { ReactNode } from 'react';
import { LocalizedText } from '@/shared/ui/localized-text';
import type { CategoryView, DishView } from '../queries';
import { DishRow } from './dish-row';

export function MenuSection({ category, dishAction }: { category: CategoryView; dishAction?: (dish: DishView) => ReactNode }) {
  return (
    <section aria-labelledby={`category-${category.id}`} className="flex flex-col">
      <h3 id={`category-${category.id}`} className="border-b border-line pb-1 text-lg font-bold">
        <LocalizedText pair={category.name} />
      </h3>
      <ul className="divide-y divide-line">
        {category.dishes.map((dish) => (
          <DishRow key={dish.id} dish={dish} action={dishAction?.(dish)} />
        ))}
      </ul>
    </section>
  );
}
