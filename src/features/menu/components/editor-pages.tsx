import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { HoursEditor } from '../../kitchens/components/hours-editor';
import {
  getCategoryForEditor,
  getDishForEditor,
  getKitchenRow,
  getMenuForEditor,
} from '../../kitchens/queries';
import { loadWeekHours } from '../../kitchens/queries';
import { CategoryForm } from './category-form';
import { DishForm } from './dish-form';
import { LastChanged } from './last-changed';
import { MenuEditor } from './menu-editor';

/**
 * Editor pages shared by the partner surface (/partner/...) and the admin surface
 * (/admin/partners/[id]/...). Callers check the session first and pass the kitchen to edit.
 */
type Scope = { surface: 'partner' | 'admin'; kitchenId: string; basePath: string };

export async function MenuEditorPage({ surface, kitchenId, basePath, saved, missing }: Scope & { saved?: string; missing?: string }) {
  const t = await getTranslations('menuEditor');
  const categories = await getMenuForEditor(kitchenId);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title font-bold">{t('title')}</h1>
      {saved ? (
        <div role="status" data-testid="saved-notice" className="rounded-lg border border-transparent bg-open-soft p-3 text-base">
          <p className="font-semibold">{t('savedNotice')}</p>
          {missing === 'kn' ? <p>{t('missingKnReminder')}</p> : null}
          {missing === 'en' ? <p>{t('missingEnReminder')}</p> : null}
        </div>
      ) : null}
      <MenuEditor scope={{ surface, kitchenId }} basePath={basePath} categories={categories} showLastChanged={surface === 'admin'} />
    </div>
  );
}

export async function CategoryEditorPage({ surface, kitchenId, categoryId }: Scope & { categoryId?: string }) {
  const t = await getTranslations('categoryForm');
  const category = categoryId ? await getCategoryForEditor(kitchenId, categoryId) : undefined;
  if (categoryId && !category) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title font-bold">{category ? t('editTitle') : t('newTitle')}</h1>
      {category && surface === 'admin' ? <LastChanged role={category.updatedByRole} phone={category.updatedByPhone} at={category.updatedAt} /> : null}
      <CategoryForm surface={surface} kitchenId={kitchenId} category={category ?? undefined} />
    </div>
  );
}

export async function DishEditorPage({
  surface,
  kitchenId,
  dishId,
  categoryId,
}: Scope & { dishId?: string; categoryId?: string }) {
  const t = await getTranslations('dishForm');
  const [kitchen, categories, dish] = await Promise.all([
    getKitchenRow(kitchenId),
    getMenuForEditor(kitchenId),
    dishId ? getDishForEditor(kitchenId, dishId) : Promise.resolve(undefined),
  ]);
  if (!kitchen || (dishId && !dish) || categories.length === 0) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title font-bold">{dish ? t('editTitle') : t('newTitle')}</h1>
      {dish && surface === 'admin' ? <LastChanged role={dish.updatedByRole} phone={dish.updatedByPhone} at={dish.updatedAt} /> : null}
      <DishForm
        surface={surface}
        kitchenId={kitchenId}
        pureVeg={kitchen.pureVeg}
        categories={categories.map(({ id, nameEn, nameKn }) => ({ id, nameEn, nameKn }))}
        defaultCategoryId={categoryId}
        dish={dish ?? undefined}
      />
    </div>
  );
}

export async function HoursEditorPage({ surface, kitchenId }: Scope) {
  const t = await getTranslations('hoursEditor');
  const kitchen = await getKitchenRow(kitchenId);
  if (!kitchen) notFound();
  const week = (await loadWeekHours([kitchenId])).get(kitchenId)!;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title font-bold">{t('title')}</h1>
      {surface === 'admin' ? <LastChanged role={kitchen.hoursUpdatedByRole} phone={kitchen.hoursUpdatedByPhone} at={kitchen.hoursUpdatedAt} /> : null}
      <HoursEditor surface={surface} kitchenId={kitchenId} week={week} />
    </div>
  );
}
