'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { formChecked, formFile, formOptionalId, formText, formValues } from '@/shared/forms';
import type { ResultError } from '@/shared/result';
import { runAsKitchenActor } from '../../auth/action-helpers';
import { editorBasePath } from '../../auth/actor';
import { resolveKitchenScope, type Actor } from '../../auth/actor-scope';
import { getMenuForEditor } from '../../kitchens/queries';
import { deleteDish, reorderDishes, saveDish, setDishAvailable } from '../services/dishes';

export type DishFormState = { values?: Record<string, string>; error?: ResultError };

function menuPath(actor: Actor, kitchenId: string | undefined): string {
  return `${editorBasePath(actor, kitchenId ?? (actor.role === 'partner' ? actor.kitchenId : ''))}/menu`;
}

/** Whole rupees from a form field; anything else becomes NaN and fails validation as `priceRange`. */
function readPrice(value: string): number {
  return /^\s*\d+\s*$/.test(value) ? Number(value) : Number.NaN;
}

export async function saveDishAction(_previous: DishFormState, formData: FormData): Promise<DishFormState> {
  const kitchenId = formOptionalId(formData, 'kitchenId');
  const upload = await formFile(formData, 'photo');
  const photo = upload ?? (formChecked(formData, 'removePhoto') ? null : undefined);
  const { actor, result } = await runAsKitchenActor('saveDishAction', formData, (a) =>
    saveDish(a, {
      kitchenId,
      id: formOptionalId(formData, 'id'),
      categoryId: formText(formData, 'categoryId'),
      name: { en: formText(formData, 'nameEn'), kn: formText(formData, 'nameKn') },
      description: { en: formText(formData, 'descriptionEn'), kn: formText(formData, 'descriptionKn') },
      priceRupees: readPrice(formText(formData, 'priceRupees')),
      isVeg: formText(formData, 'isVeg') !== 'false',
      available: formChecked(formData, 'available'),
      photo,
    }),
  );
  if (!result.ok || !actor) return { values: formValues(formData), error: result.ok ? undefined : result.error };
  revalidatePath('/', 'layout');
  const missing = result.data.missingLanguage ? `&missing=${result.data.missingLanguage}` : '';
  redirect(`${menuPath(actor, kitchenId)}?saved=${result.data.id}${missing}`);
}

export async function setDishAvailableAction(formData: FormData): Promise<void> {
  await runAsKitchenActor('setDishAvailableAction', formData, (actor) =>
    setDishAvailable(actor, {
      kitchenId: formOptionalId(formData, 'kitchenId'),
      id: formText(formData, 'id'),
      available: formText(formData, 'available') === 'true',
    }),
  );
  revalidatePath('/', 'layout');
}

export async function deleteDishAction(formData: FormData): Promise<void> {
  const kitchenId = formOptionalId(formData, 'kitchenId');
  const { actor, result } = await runAsKitchenActor('deleteDishAction', formData, (a) =>
    deleteDish(a, { kitchenId, id: formText(formData, 'id') }),
  );
  if (!actor || !result.ok) return;
  revalidatePath('/', 'layout');
  redirect(menuPath(actor, kitchenId));
}

export async function moveDishAction(formData: FormData): Promise<void> {
  const kitchenId = formOptionalId(formData, 'kitchenId');
  const id = formText(formData, 'id');
  const direction = formText(formData, 'direction') === 'up' ? -1 : 1;
  await runAsKitchenActor('moveDishAction', formData, async (actor) => {
    const scope = resolveKitchenScope(actor, kitchenId);
    if (!scope.ok) return scope;
    const category = (await getMenuForEditor(scope.data)).find((c) => c.dishes.some((d) => d.id === id));
    if (!category) return { ok: true, data: {} };
    const ids = category.dishes.map((d) => d.id);
    const index = ids.indexOf(id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return { ok: true, data: {} };
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    return reorderDishes(actor, { kitchenId, categoryId: category.id, ids });
  });
  revalidatePath('/', 'layout');
}
