'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { TextField } from '@/shared/ui/field';
import { FormError, SavedMessage } from '@/shared/ui/form-message';
import { useErrorText } from '@/shared/ui/use-error-text';
import { setKitchenPhotoAction, type AdminFormState } from '../../actions/admin';

export function PhotoForm({ kitchenId, hasPhoto }: { kitchenId: string; hasPhoto: boolean }) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(setKitchenPhotoAction, {});
  const errors = useErrorText(state.error);
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-heading font-bold">{t('admin.photoTitle')}</h2>
      <form action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="kitchenId" value={kitchenId} />
        <TextField name="photo" type="file" accept="image/jpeg,image/png,image/webp" label={t('admin.photoUpload')} hint={t('dishForm.photoHint')} error={errors.field('photo')} />
        <div className="flex items-center gap-2">
          <Button type="submit" variant="secondary" disabled={pending}>
            {t('admin.photoUpload')}
          </Button>
          {hasPhoto ? (
            <Button type="submit" name="remove" value="on" variant="ghost" disabled={pending}>
              {t('admin.photoRemove')}
            </Button>
          ) : null}
          <SavedMessage show={state.saved} label={t('admin.saved')} />
        </div>
        <FormError message={errors.form} />
      </form>
    </Card>
  );
}
