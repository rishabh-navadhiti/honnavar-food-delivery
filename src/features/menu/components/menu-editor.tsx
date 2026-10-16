import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { isLocale } from '@/shared/i18n/config';
import { formatPrice } from '@/shared/i18n/format';
import { pickLocalized } from '@/shared/i18n/localized';
import { Badge } from '@/shared/ui/badge';
import { buttonClasses } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { LocalizedText } from '@/shared/ui/localized-text';
import { VegMark } from '@/shared/ui/veg-mark';
import { ScopeFields } from '../../kitchens/components/scope-fields';
import type { EditorCategory } from '../../kitchens/queries';
import { moveCategoryAction } from '../actions/categories';
import { moveDishAction, setDishAvailableAction } from '../actions/dishes';
import { LastChanged } from './last-changed';

type Scope = { surface: 'partner' | 'admin'; kitchenId: string };

function MissingBadges({ en, kn }: { en: string | null; kn: string | null }) {
  const t = useTranslations('menuEditor');
  return (
    <>
      {!en?.trim() ? <Badge tone="warn">{t('missingEn')}</Badge> : null}
      {!kn?.trim() ? <Badge tone="warn">{t('missingKn')}</Badge> : null}
    </>
  );
}

function MoveButtons({ scope, id, name, action, first, last }: { scope: Scope; id: string; name: string; action: (f: FormData) => Promise<void>; first: boolean; last: boolean }) {
  const t = useTranslations('menuEditor');
  return (
    <div className="flex gap-1">
      {(['up', 'down'] as const).map((direction) => (
        <form key={direction} action={action}>
          <ScopeFields {...scope} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="direction" value={direction} />
          <button
            type="submit"
            disabled={direction === 'up' ? first : last}
            aria-label={direction === 'up' ? t('moveUp', { name }) : t('moveDown', { name })}
            className="flex size-touch items-center justify-center rounded-md bg-surface shadow-1 text-lg disabled:opacity-30"
          >
            <span aria-hidden="true">{direction === 'up' ? '↑' : '↓'}</span>
          </button>
        </form>
      ))}
    </div>
  );
}

/**
 * The menu editor shared by the partner and admin surfaces (FR-033, FR-034, FR-036, FR-054).
 * Every control is a plain form, so it works without client JavaScript.
 */
export function MenuEditor({
  scope,
  basePath,
  categories,
  showLastChanged,
}: {
  scope: Scope;
  basePath: string;
  categories: EditorCategory[];
  showLastChanged: boolean;
}) {
  const t = useTranslations();
  const current = useLocale();
  const locale = isLocale(current) ? current : 'en';
  const nameOf = (pair: { nameEn: string | null; nameKn: string | null }) =>
    pickLocalized({ en: pair.nameEn, kn: pair.nameKn }, locale)?.text ?? '';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <Link href={`${basePath}/menu/categories/new`} className={buttonClasses('secondary')}>
          {t('menuEditor.addCategory')}
        </Link>
        {categories.length > 0 ? (
          <Link href={`${basePath}/menu/dishes/new`} className={buttonClasses('primary')}>
            {t('menuEditor.addDish')}
          </Link>
        ) : null}
      </div>

      {categories.length === 0 ? (
        <EmptyState title={t('menuEditor.emptyTitle')} body={t('menuEditor.emptyBody')} />
      ) : null}

      {categories.map((category, ci) => (
        <section key={category.id} aria-labelledby={`cat-${category.id}`} className="flex flex-col gap-2" data-testid="editor-category">
          <div className="flex items-start justify-between gap-2 border-b border-line pb-2">
            <div className="flex flex-col gap-1">
              <h2 id={`cat-${category.id}`} className="text-heading font-bold">
                <LocalizedText pair={{ en: category.nameEn, kn: category.nameKn }} />
              </h2>
              <div className="flex flex-wrap gap-1">
                <MissingBadges en={category.nameEn} kn={category.nameKn} />
              </div>
              {showLastChanged ? <LastChanged role={category.updatedByRole} phone={category.updatedByPhone} at={category.updatedAt} /> : null}
            </div>
            <div className="flex items-center gap-1">
              <MoveButtons scope={scope} id={category.id} name={nameOf(category)} action={moveCategoryAction} first={ci === 0} last={ci === categories.length - 1} />
              <Link href={`${basePath}/menu/categories/${category.id}`} className={buttonClasses('ghost', 'px-2')}>
                {t('common.edit')}
              </Link>
            </div>
          </div>
          {category.dishes.length === 0 ? <p className="text-base text-muted">{t('menuEditor.emptyCategory')}</p> : null}
          <ul className="flex flex-col gap-2">
            {category.dishes.map((dish, di) => {
              const name = nameOf(dish);
              return (
                <li
                  key={dish.id}
                  data-testid="editor-dish"
                  data-dish-id={dish.id}
                  className={`flex flex-col gap-2 rounded-lg bg-surface shadow-1 p-3 ${dish.available ? '' : 'opacity-70'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col gap-1">
                      <VegMark isVeg={dish.isVeg} />
                      <p className="font-semibold">
                        <LocalizedText pair={{ en: dish.nameEn, kn: dish.nameKn }} />
                      </p>
                      <p className="font-bold">{formatPrice(dish.priceRupees, locale)}</p>
                      <div className="flex flex-wrap gap-1">
                        <MissingBadges en={dish.nameEn} kn={dish.nameKn} />
                        {dish.available ? null : <Badge tone="closed">{t('menu.notAvailable')}</Badge>}
                      </div>
                      {showLastChanged ? <LastChanged role={dish.updatedByRole} phone={dish.updatedByPhone} at={dish.updatedAt} /> : null}
                    </div>
                    <MoveButtons scope={scope} id={dish.id} name={name} action={moveDishAction} first={di === 0} last={di === category.dishes.length - 1} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={setDishAvailableAction}>
                      <ScopeFields {...scope} />
                      <input type="hidden" name="id" value={dish.id} />
                      <input type="hidden" name="available" value={dish.available ? 'false' : 'true'} />
                      <button type="submit" className={buttonClasses(dish.available ? 'secondary' : 'primary')}>
                        {dish.available ? t('menuEditor.makeUnavailable') : t('menuEditor.makeAvailable')}
                      </button>
                    </form>
                    <Link href={`${basePath}/menu/dishes/${dish.id}`} aria-label={t('menuEditor.editDish', { name })} className={buttonClasses('ghost')}>
                      {t('common.edit')}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
