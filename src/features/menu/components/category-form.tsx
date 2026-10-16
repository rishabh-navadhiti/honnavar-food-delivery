'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/ui/button';
import { errorKey } from '@/shared/ui/error-text';
import { TextField } from '@/shared/ui/field';
import { ScopeFields } from '../../kitchens/components/scope-fields';
import { deleteCategoryAction, saveCategoryAction, type CategoryFormState } from '../actions/categories';

type Props = {
  surface: 'partner' | 'admin';
  kitchenId: string;
  category?: { id: string; nameEn: string | null; nameKn: string | null };
};

/** Category names in both languages (FR-033). Keeps entered values after a failed save (FR-048). */
export function CategoryForm({ surface, kitchenId, category }: Props) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState<CategoryFormState, FormData>(saveCategoryAction, {});
  const [deleteState, deleteAction, deleting] = useActionState<CategoryFormState, FormData>(deleteCategoryAction, {});
  const values = state.values ?? { nameEn: category?.nameEn ?? '', nameKn: category?.nameKn ?? '' };
  const nameError = state.error?.fieldErrors?.name ?? state.error?.fieldErrors?.['name.en'] ?? state.error?.fieldErrors?.['name.kn'];
  const formError = state.error && !state.error.fieldErrors ? t(`errors.${errorKey(state.error.code)}`) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} key={JSON.stringify(values)} className="flex flex-col gap-4" noValidate>
        <ScopeFields surface={surface} kitchenId={kitchenId} />
        {category ? <input type="hidden" name="id" value={category.id} /> : null}
        <p className="text-small text-muted">{t('categoryForm.nameHint')}</p>
        <TextField name="nameEn" lang="en" label={t('categoryForm.nameEn')} defaultValue={values.nameEn} maxLength={60} error={nameError ? t(`errors.${nameError}`) : undefined} />
        <TextField name="nameKn" lang="kn" label={t('categoryForm.nameKn')} defaultValue={values.nameKn} maxLength={60} />
        {formError ? (
          <p role="alert" className="font-medium text-danger">
            {formError}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="text-lg">
          {pending ? t('common.saving') : t('common.save')}
        </Button>
      </form>
      {category ? (
        <form action={deleteAction} className="flex flex-col gap-2">
          <ScopeFields surface={surface} kitchenId={kitchenId} />
          <input type="hidden" name="id" value={category.id} />
          {deleteState.error ? (
            <p role="alert" className="font-medium text-danger">
              {t(`errors.${errorKey(deleteState.error.code)}`)}
            </p>
          ) : null}
          <Button type="submit" variant="danger" disabled={deleting}>
            {t('categoryForm.delete')}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
