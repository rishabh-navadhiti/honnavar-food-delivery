'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { MapTiles } from '@/shared/maps/config';
import { PinPicker, type PickedLocation } from '@/shared/maps/pin-picker';
import { AddressDetailsForm, type AddressValues } from './address-details-form';

/**
 * Adding or editing an address (FR-053, FR-054): step 1 places the pin on the map, step 2 asks for
 * the details. Editing starts on step 2 with the saved pin.
 */
export function AddressFlow({
  tiles,
  next,
  saved,
}: {
  tiles: MapTiles;
  next: string;
  saved?: { values: AddressValues; location: PickedLocation };
}) {
  const t = useTranslations('addresses');
  const [location, setLocation] = useState<PickedLocation | null>(saved?.location ?? null);
  const [step, setStep] = useState<'map' | 'details'>(saved ? 'details' : 'map');

  if (step === 'map' || !location) {
    return (
      <section className="flex flex-col gap-3" aria-labelledby="map-step-title">
        <h2 id="map-step-title" className="text-heading font-bold">
          {t('mapStepTitle')}
        </h2>
        <p className="text-base text-muted">{t('mapStepHint')}</p>
        <PinPicker
          tiles={tiles}
          initial={location}
          onContinue={(picked) => {
            setLocation(picked);
            setStep('details');
          }}
        />
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-3" aria-labelledby="details-step-title">
      <h2 id="details-step-title" className="text-heading font-bold">
        {t('detailsStepTitle')}
      </h2>
      <AddressDetailsForm location={location} values={saved?.values} next={next} onChangeLocation={() => setStep('map')} />
    </section>
  );
}
