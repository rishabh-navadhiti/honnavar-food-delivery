'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { formOptionalId, formText, formValues } from '@/shared/forms';
import type { ResultError } from '@/shared/result';
import { runAsKitchenActor } from '../../auth/action-helpers';
import { editorBasePath } from '../../auth/actor';
import { resolveKitchenScope } from '../../auth/actor-scope';
import { getMenuForEditor } from '../../kitchens/queries';
import { deleteCategory, reorderCategories, saveCategory } from '../services/categories';

export type CategoryFormState = { values?: Record<string, string>; error?: ResultError };

export async function saveCategoryAction(_previous: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  const kitchenId = formOptionalId(formData, 'kitchenId');
  const { actor, result } = await runAsKitchenActor('saveCategoryAction', formData, (a) =>
    saveCategory(a, {
      kitchenId,
      id: formOptionalId(formData, 'id'),
      name: { en: formText(formData, 'nameEn'), kn: formText(formData, 'nameKn') },
    }),
  );
  if (!result.ok || !actor) return { values: formValues(formData), error: result.ok ? undefined : result.error };
  revalidatePath('/', 'layout');
  redirect(`${editorBasePath(actor, kitchenId ?? (actor.role === 'partner' ? actor.kitchenId : ''))}/menu?saved=1`);
}

export async function deleteCategoryAction(_previous: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  const kitchenId = formOptionalId(formData, 'kitchenId');
  const { actor, result } = await runAsKitchenActor('deleteCategoryAction', formData, (a) =>
    deleteCategory(a, { kitchenId, id: formText(formData, 'id') }),
  );
  if (!result.ok || !actor) return { values: formValues(formData), error: result.ok ? undefined : result.error };
  revalidatePath('/', 'layout');
  redirect(`${editorBasePath(actor, kitchenId ?? (actor.role === 'partner' ? actor.kitchenId : ''))}/menu`);
}

/** Up/down buttons: swap with the neighbour and save the full order (no drag-and-drop, no client JS). */
export async function moveCategoryAction(formData: FormData): Promise<void> {
  const kitchenId = formOptionalId(formData, 'kitchenId');
  const id = formText(formData, 'id');
  const direction = formText(formData, 'direction') === 'up' ? -1 : 1;
  await runAsKitchenActor('moveCategoryAction', formData, async (actor) => {
    const scope = resolveKitchenScope(actor, kitchenId);
    if (!scope.ok) return scope;
    const ids = (await getMenuForEditor(scope.data)).map((c) => c.id);
    const index = ids.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return { ok: true, data: {} };
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    return reorderCategories(actor, { kitchenId, ids });
  });
  revalidatePath('/', 'layout');
}
