'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/ui/button';
import { CheckboxField, SelectField, TextAreaField, TextField } from '@/shared/ui/field';
import { FormError, SavedMessage } from '@/shared/ui/form-message';
import type { MapTiles } from '@/shared/maps/config';
import { PinPicker } from '@/shared/maps/pin-picker';
import { useErrorText } from '@/shared/ui/use-error-text';
import { createKitchenAction, updateKitchenProfileAction, type AdminFormState } from '../../actions/admin';

export type ProfileValues = {
  nameEn: string | null;
  nameKn: string | null;
  descriptionEn: string | null;
  descriptionKn: string | null;
  type: 'restaurant' | 'home_kitchen' | 'cloud_kitchen';
  pureVeg: boolean;
  address: string;
  landmark: string;
  contacts: { phone: string; isPrimary: boolean }[];
  locationLat: number | null;
  locationLng: number | null;
  prepMinutes: number;
};

const ROWS = [1, 2, 3];

function initialValues(profile?: ProfileValues): Record<string, string> {
  if (!profile)
    return { type: 'restaurant', primaryContact: '1', opens1: '11:00', closes1: '15:00', opens2: '18:00', closes2: '22:00', prepMinutes: '25' };
  const values: Record<string, string> = {
    nameEn: profile.nameEn ?? '',
    nameKn: profile.nameKn ?? '',
    descriptionEn: profile.descriptionEn ?? '',
    descriptionKn: profile.descriptionKn ?? '',
    type: profile.type,
    address: profile.address,
    landmark: profile.landmark,
    primaryContact: String(Math.max(1, profile.contacts.findIndex((c) => c.isPrimary) + 1)),
    prepMinutes: String(profile.prepMinutes),
  };
  if (profile.locationLat !== null && profile.locationLng !== null) {
    values.locationLat = String(profile.locationLat);
    values.locationLng = String(profile.locationLng);
  }
  if (profile.pureVeg) values.pureVeg = 'on';
  profile.contacts.slice(0, 3).forEach((c, i) => (values[`contact${i + 1}`] = c.phone));
  return values;
}

/**
 * Create a kitchen (mode "create": also sign-in list, daily hours and photo) or edit the
 * admin-managed profile (FR-019). Keeps entered values after a failed save (FR-048).
 */
export function KitchenProfileForm({
  mode,
  kitchenId,
  profile,
  tiles,
}: {
  mode: 'create' | 'edit';
  kitchenId?: string;
  profile?: ProfileValues;
  tiles: MapTiles;
}) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    mode === 'create' ? createKitchenAction : updateKitchenProfileAction,
    {},
  );
  const values = state.values ?? initialValues(profile);
  const errors = useErrorText(state.error);
  const savedPoint = values.locationLat && values.locationLng ? { lat: Number(values.locationLat), lng: Number(values.locationLng) } : null;
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(savedPoint);

  return (
    <form action={formAction} key={JSON.stringify(values)} className="grid gap-4 md:grid-cols-2" noValidate>
      {kitchenId ? <input type="hidden" name="kitchenId" value={kitchenId} /> : null}
      <TextField name="nameEn" lang="en" label={t('admin.nameEn')} defaultValue={values.nameEn} maxLength={80} error={errors.field('name', 'name.en')} />
      <TextField name="nameKn" lang="kn" label={t('admin.nameKn')} defaultValue={values.nameKn} maxLength={80} error={errors.field('name.kn')} />
      <TextAreaField name="descriptionEn" lang="en" label={t('admin.descriptionEn')} hint={t('common.optional')} defaultValue={values.descriptionEn} maxLength={300} />
      <TextAreaField name="descriptionKn" lang="kn" label={t('admin.descriptionKn')} hint={t('common.optional')} defaultValue={values.descriptionKn} maxLength={300} />
      <SelectField name="type" label={t('admin.type')} defaultValue={values.type} error={errors.field('type')}>
        {(['restaurant', 'home_kitchen', 'cloud_kitchen'] as const).map((type) => (
          <option key={type} value={type}>
            {t(`kitchenType.${type}`)}
          </option>
        ))}
      </SelectField>
      <div className="flex items-end">
        <CheckboxField name="pureVeg" label={t('admin.pureVeg')} defaultChecked={values.pureVeg === 'on'} />
      </div>
      <TextField name="landmark" label={t('admin.landmark')} hint={t('admin.landmarkHint')} defaultValue={values.landmark} maxLength={100} error={errors.field('landmark')} />
      <TextField name="address" label={t('admin.address')} defaultValue={values.address} maxLength={200} error={errors.field('address')} />
      <TextField
        name="prepMinutes"
        type="number"
        inputMode="numeric"
        min={5}
        max={120}
        label={t('kitchenForm.prepMinutes')}
        hint={t('kitchenForm.prepMinutesHint')}
        defaultValue={values.prepMinutes}
        error={errors.field('prepMinutes')}
      />

      <fieldset className="flex flex-col gap-2 md:col-span-2">
        <legend className="text-base font-bold">{t('kitchenForm.location')}</legend>
        <p className="text-sm text-muted">{t('kitchenForm.locationHelp')}</p>
        <input type="hidden" name="locationLat" value={point?.lat ?? ''} />
        <input type="hidden" name="locationLng" value={point?.lng ?? ''} />
        <div className="max-w-xl">
          <PinPicker tiles={tiles} initial={savedPoint} onChange={(picked) => setPoint({ lat: picked.lat, lng: picked.lng })} />
        </div>
        {errors.field('location') ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {errors.field('location')}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-2 md:col-span-2">
        <legend className="text-base font-bold">{t('admin.contactsTitle')}</legend>
        <p className="text-sm text-muted">{t('admin.contactsHelp')}</p>
        {ROWS.map((n) => (
          <div key={n} className="flex items-end gap-3">
            <div className="flex-1">
              <TextField name={`contact${n}`} type="tel" inputMode="numeric" label={t('admin.contactPhone', { n })} defaultValue={values[`contact${n}`]} />
            </div>
            <label className="flex min-h-touch items-center gap-2">
              <input type="radio" name="primaryContact" value={String(n)} defaultChecked={values.primaryContact === String(n)} className="size-5 accent-primary" />
              <span>{t('admin.primaryContact')}</span>
            </label>
          </div>
        ))}
        <FormError message={errors.field('contacts')} />
      </fieldset>

      {mode === 'create' ? (
        <>
          <fieldset className="flex flex-col gap-2 md:col-span-2">
            <legend className="text-base font-bold">{t('admin.signinsTitle')}</legend>
            <p className="text-sm text-muted">{t('admin.signinsHelp')}</p>
            {ROWS.map((n) => (
              <div key={n} className="grid gap-3 md:grid-cols-2">
                <TextField name={`signin${n}`} type="tel" inputMode="numeric" label={t('admin.signinPhone', { n })} defaultValue={values[`signin${n}`]} />
                <TextField name={`signinName${n}`} label={t('admin.signinName', { n })} defaultValue={values[`signinName${n}`]} maxLength={60} />
              </div>
            ))}
            <FormError message={errors.field('signins')} />
          </fieldset>
          <fieldset className="flex flex-col gap-2 md:col-span-2">
            <legend className="text-base font-bold">{t('admin.hoursTitle')}</legend>
            <p className="text-sm text-muted">{t('admin.hoursHelp')}</p>
            {[1, 2].map((n) => (
              <div key={n} className="grid grid-cols-2 gap-3">
                <TextField name={`opens${n}`} type="time" label={`${n === 1 ? t('hoursEditor.firstRange') : t('hoursEditor.secondRange')} · ${t('hoursEditor.opens')}`} defaultValue={values[`opens${n}`]} />
                <TextField name={`closes${n}`} type="time" label={`${n === 1 ? t('hoursEditor.firstRange') : t('hoursEditor.secondRange')} · ${t('hoursEditor.closes')}`} defaultValue={values[`closes${n}`]} />
              </div>
            ))}
            <FormError message={errors.field('hours')} />
          </fieldset>
          <div className="md:col-span-2">
            <TextField name="photo" type="file" accept="image/jpeg,image/png,image/webp" label={t('admin.photoTitle')} hint={t('dishForm.photoHint')} error={errors.field('photo')} />
          </div>
        </>
      ) : null}

      <div className="flex items-center gap-3 md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? t('common.saving') : mode === 'create' ? t('admin.create') : t('admin.saveProfile')}
        </Button>
        <SavedMessage show={state.saved} label={t('admin.saved')} />
      </div>
      <div className="md:col-span-2">
        <FormError message={errors.form} />
      </div>
    </form>
  );
}
