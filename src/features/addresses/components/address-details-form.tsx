'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import type { PickedLocation } from '@/shared/maps/pin-picker';
import { Button } from '@/shared/ui/button';
import { TextAreaField, TextField } from '@/shared/ui/field';
import { FormError } from '@/shared/ui/form-message';
import { useErrorText } from '@/shared/ui/use-error-text';
import { saveAddressAction, type AddressFormState } from '../actions';
import { VoiceRecorder } from './voice-recorder';

export type AddressValues = {
  id?: string;
  label: 'home' | 'work' | 'other';
  house: string;
  street: string | null;
  landmark: string;
  riderNote: string | null;
  voiceNoteId: string | null;
};

const LABELS = ['home', 'work', 'other'] as const;

/** Step 2 of adding an address (FR-054): house details, landmark, notes, voice note and a label. */
export function AddressDetailsForm({
  location,
  values,
  next,
  onChangeLocation,
}: {
  location: PickedLocation;
  values?: AddressValues;
  next: string;
  onChangeLocation: () => void;
}) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState<AddressFormState, FormData>(saveAddressAction, {});
  const errors = useErrorText(state.error);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {values?.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="lat" value={location.lat} />
      <input type="hidden" name="lng" value={location.lng} />
      <input type="hidden" name="geocodedText" value={location.geocodedText ?? ''} />

      <div className="flex items-start justify-between gap-3 rounded-xl bg-secondary p-3">
        <p className="text-base">{location.geocodedText ?? t('pinPicker.pinPlaced')}</p>
        <button type="button" onClick={onChangeLocation} className="min-h-touch shrink-0 text-base font-semibold text-primary">
          {t('addresses.changeLocation')}
        </button>
      </div>

      <TextField
        name="house"
        label={t('addresses.house')}
        required
        maxLength={100}
        defaultValue={values?.house}
        autoComplete="address-line1"
        error={errors.field('house')}
      />
      <TextField
        name="street"
        label={t('addresses.street')}
        maxLength={150}
        defaultValue={values?.street ?? ''}
        autoComplete="address-line2"
        error={errors.field('street')}
      />
      <TextField
        name="landmark"
        label={t('addresses.landmark')}
        hint={t('addresses.landmarkHint')}
        required
        maxLength={100}
        defaultValue={values?.landmark}
        error={errors.field('landmark')}
      />
      <TextAreaField
        name="riderNote"
        label={t('addresses.riderNote')}
        maxLength={200}
        defaultValue={values?.riderNote ?? ''}
        error={errors.field('riderNote')}
      />
      <VoiceRecorder existingUrl={values?.voiceNoteId ? `/voice-notes/${values.voiceNoteId}` : null} />
      {errors.field('voiceNote') ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {errors.field('voiceNote')}
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold">{t('addresses.labelTitle')}</legend>
        <div className="grid grid-cols-3 gap-2">
          {LABELS.map((label) => (
            <label
              key={label}
              className="flex min-h-touch cursor-pointer items-center justify-center rounded-xl border border-line bg-surface px-2 text-base font-semibold has-[:checked]:border-primary has-[:checked]:bg-orange-50"
            >
              <input type="radio" name="label" value={label} defaultChecked={(values?.label ?? 'home') === label} className="sr-only" />
              {t(`addressLabel.${label}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <FormError message={errors.form} />
      <Button type="submit" disabled={pending}>
        {pending ? t('common.saving') : t('addresses.save')}
      </Button>
    </form>
  );
}
