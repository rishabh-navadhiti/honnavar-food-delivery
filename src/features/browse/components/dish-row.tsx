import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { isLocale, type Locale } from '@/shared/i18n/config';
import { formatPrice } from '@/shared/i18n/format';
import { pickLocalized } from '@/shared/i18n/localized';
import { LocalizedText } from '@/shared/ui/localized-text';
import { Photo } from '@/shared/ui/photo';
import { VegMark } from '@/shared/ui/veg-mark';
import type { DishView } from '../queries';

/**
 * A dish with veg mark, name, description and price, and its photo on the right with the add
 * control over its lower edge (003); dimmed when not available (FR-045). The row is the target of
 * a dish suggestion (`#dish-<id>`), tinted briefly when opened that way (research R8).
 */
export function DishRow({ dish, action }: { dish: DishView; action?: ReactNode }) {
  const t = useTranslations('menu');
  const current = useLocale();
  const locale: Locale = isLocale(current) ? current : 'en';
  const name = pickLocalized(dish.name, locale)?.text ?? '';
  const description = pickLocalized(dish.description, locale)?.text ?? '';
  return (
    <li
      id={`dish-${dish.id}`}
      data-testid="dish-row"
      data-dish-id={dish.id}
      data-available={dish.available}
      data-veg={dish.isVeg}
      className={`-mx-3 flex scroll-mt-[calc(var(--spacing-topbar)+1rem)] gap-3 rounded-md px-3 py-4 target:animate-target-tint ${dish.available ? '' : 'opacity-60'}`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <VegMark isVeg={dish.isVeg} />
        <p className="stretch-head text-heading font-bold leading-[var(--lh-snug)] text-ink">
          <LocalizedText pair={dish.name} />
        </p>
        <span className="text-base font-bold text-ink">{formatPrice(dish.priceRupees, locale)}</span>
        {description ? (
          <p className="line-clamp-2 text-small text-muted" data-truncate title={description}>
            <LocalizedText pair={dish.description} />
          </p>
        ) : null}
      </div>
      <div className="relative flex w-28 shrink-0 flex-col items-center">
        <Photo imageId={dish.photoImageId} alt={name} placeholder={dish.isVeg ? 'veg' : 'nonveg'} sizes="112px" className="size-28 rounded-md" />
        <div className="-mt-6 flex justify-center">
          {dish.available ? (action ?? null) : (
            <span data-testid="not-available" className="rounded-full bg-closed-soft px-2.5 py-1 text-caption font-semibold text-closed shadow-1">
              {t('notAvailable')}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
