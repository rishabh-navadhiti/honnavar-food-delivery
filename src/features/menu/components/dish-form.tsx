'use client';

import { useActionState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { isLocale } from '@/shared/i18n/config';
import { pickLocalized } from '@/shared/i18n/localized';
import { Button } from '@/shared/ui/button';
import { errorKey } from '@/shared/ui/error-text';
import { CheckboxField, SelectField, TextAreaField, TextField } from '@/shared/ui/field';
import { ScopeFields } from '../../kitchens/components/scope-fields';
import { deleteDishAction, saveDishAction, type DishFormState } from '../actions/dishes';

export type DishFormDish = {
  id: string;
  categoryId: string;
  nameEn: string | null;
  nameKn: string | null;
  descriptionEn: string | null;
  descriptionKn: string | null;
  priceRupees: number;
  isVeg: boolean;
  available: boolean;
  photoImageId: string | null;
};

type Props = {
  surface: 'partner' | 'admin';
  kitchenId: string;
  pureVeg: boolean;
  categories: { id: string; nameEn: string | null; nameKn: string | null }[];
  defaultCategoryId?: string;
  dish?: DishFormDish;
};

/**
 * Dish editor (FR-034): bilingual name and description, price, veg mark (locked to veg in a pure-veg
 * kitchen, FR-035), photo and availability. Entered values survive a failed save (FR-048).
 */
export function DishForm({ surface, kitchenId, pureVeg, categories, defaultCategoryId, dish }: Props) {
  const t = useTranslations();
  const current = useLocale();
  const locale = isLocale(current) ? current : 'en';
  const [state, formAction, pending] = useActionState<DishFormState, FormData>(saveDishAction, {});
  const values: Record<string, string> = state.values ?? {
    categoryId: dish?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? '',
    nameEn: dish?.nameEn ?? '',
    nameKn: dish?.nameKn ?? '',
    descriptionEn: dish?.descriptionEn ?? '',
    descriptionKn: dish?.descriptionKn ?? '',
    priceRupees: dish ? String(dish.priceRupees) : '',
    isVeg: dish ? String(dish.isVeg) : 'true',
    available: !dish || dish.available ? 'on' : '',
  };
  const fieldError = (...names: string[]) => {
    for (const name of names) {
      const key = state.error?.fieldErrors?.[name];
      if (key) return t(`errors.${key}`);
    }
    return undefined;
  };
  const formError = state.error && !state.error.fieldErrors ? t(`errors.${errorKey(state.error.code)}`) : undefined;
  const isVeg = pureVeg || values.isVeg !== 'false';

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} key={JSON.stringify(values)} className="flex flex-col gap-4" noValidate>
        <ScopeFields surface={surface} kitchenId={kitchenId} />
        {dish ? <input type="hidden" name="id" value={dish.id} /> : null}

        <SelectField name="categoryId" label={t('dishForm.category')} defaultValue={values.categoryId} error={fieldError('categoryId')}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {pickLocalized({ en: c.nameEn, kn: c.nameKn }, locale)?.text}
            </option>
          ))}
        </SelectField>

        <p className="text-small text-muted">{t('categoryForm.nameHint')}</p>
        <TextField name="nameEn" lang="en" label={t('dishForm.nameEn')} defaultValue={values.nameEn} maxLength={80} error={fieldError('name', 'name.en')} />
        <TextField name="nameKn" lang="kn" label={t('dishForm.nameKn')} defaultValue={values.nameKn} maxLength={80} error={fieldError('name.kn')} />
        <TextAreaField name="descriptionEn" lang="en" label={t('dishForm.descriptionEn')} hint={t('common.optional')} defaultValue={values.descriptionEn} maxLength={300} error={fieldError('description.en')} />
        <TextAreaField name="descriptionKn" lang="kn" label={t('dishForm.descriptionKn')} hint={t('common.optional')} defaultValue={values.descriptionKn} maxLength={300} error={fieldError('description.kn')} />
        <TextField
          name="priceRupees"
          inputMode="numeric"
          label={t('dishForm.price')}
          defaultValue={values.priceRupees}
          error={fieldError('priceRupees')}
          required
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="text-small font-semibold">{t('dishForm.vegQuestion')}</legend>
          {pureVeg ? (
            <>
              <input type="hidden" name="isVeg" value="true" />
              <p className="text-base text-muted" data-testid="pure-veg-locked">
                {t('dishForm.pureVegLocked')}
              </p>
            </>
          ) : (
            <div className="flex gap-3">
              {(['true', 'false'] as const).map((v) => (
                <label key={v} className="flex min-h-touch flex-1 cursor-pointer items-center gap-2 rounded-md bg-surface shadow-1 px-3">
                  <input type="radio" name="isVeg" value={v} defaultChecked={String(isVeg) === v} className="size-5 accent-primary" />
                  <span>{v === 'true' ? t('veg.veg') : t('veg.nonVeg')}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <CheckboxField name="available" label={t('dishForm.available')} defaultChecked={values.available === 'on'} />

        <TextField
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          label={t('dishForm.photo')}
          hint={t('dishForm.photoHint')}
          error={fieldError('photo')}
        />
        {dish?.photoImageId ? <CheckboxField name="removePhoto" label={t('dishForm.removePhoto')} /> : null}

        {formError ? (
          <p role="alert" className="font-medium text-danger">
            {formError}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="text-lg">
          {pending ? t('common.saving') : t('dishForm.save')}
        </Button>
      </form>

      {dish ? (
        <form action={deleteDishAction}>
          <ScopeFields surface={surface} kitchenId={kitchenId} />
          <input type="hidden" name="id" value={dish.id} />
          <Button type="submit" variant="danger">
            {t('dishForm.delete')}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
