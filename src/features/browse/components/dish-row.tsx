import { useLocale, useTranslations } from 'next-intl';
import { isLocale, type Locale } from '@/shared/i18n/config';
import { formatPrice } from '@/shared/i18n/format';
import { pickLocalized } from '@/shared/i18n/localized';
import { LocalizedText } from '@/shared/ui/localized-text';
import { Photo } from '@/shared/ui/photo';
import { VegMark } from '@/shared/ui/veg-mark';
import type { DishView } from '../queries';

/** A dish with photo, name, description, price and veg mark; dimmed when not available (FR-045). */
export function DishRow({ dish }: { dish: DishView }) {
  const t = useTranslations('menu');
  const current = useLocale();
  const locale: Locale = isLocale(current) ? current : 'en';
  const name = pickLocalized(dish.name, locale)?.text ?? '';
  return (
    <li
      data-testid="dish-row"
      data-dish-id={dish.id}
      data-available={dish.available}
      className={`flex gap-3 py-3 ${dish.available ? '' : 'opacity-60'}`}
    >
      <Photo
        imageId={dish.photoImageId}
        alt={name}
        placeholder={dish.isVeg ? 'veg' : 'nonveg'}
        sizes="96px"
        className="size-24 shrink-0 rounded-xl"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <VegMark isVeg={dish.isVeg} />
        <p className="text-base font-semibold text-ink">
          <LocalizedText pair={dish.name} />
        </p>
        <LocalizedText pair={dish.description} className="text-sm text-muted" />
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="text-base font-bold">{formatPrice(dish.priceRupees, locale)}</span>
          {dish.available ? null : (
            <span data-testid="not-available" className="rounded-full border border-line px-2 py-0.5 text-sm font-medium text-muted">
              {t('notAvailable')}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
