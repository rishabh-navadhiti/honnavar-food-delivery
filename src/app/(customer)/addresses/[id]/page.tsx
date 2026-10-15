import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { deleteAddressAction } from '@/features/addresses/actions';
import { AddressFlow } from '@/features/addresses/components/address-flow';
import { getAddress } from '@/features/addresses/queries';
import { requireSession } from '@/features/auth/session';
import { mapTiles } from '@/shared/maps/tiles';
import { buttonClasses } from '@/shared/ui/button';
import { CustomerDock } from '@/features/cart/components/customer-dock';

type Props = { params: Promise<{ id: string }> };

export default async function EditAddressPage({ params }: Props) {
  const session = await requireSession('customer');
  const t = await getTranslations('addresses');
  const id = z.uuid().safeParse((await params).id);
  const address = id.success ? await getAddress(session.subjectId, id.data) : null;
  if (!address) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t('editTitle')}</h1>
      <AddressFlow
        tiles={mapTiles()}
        next="/addresses"
        saved={{
          values: {
            id: address.id,
            label: address.label,
            labelText: address.labelText,
            house: address.house,
            street: address.street,
            landmark: address.landmark,
            riderNote: address.riderNote,
            voiceNoteId: address.voiceNoteId,
          },
          location: { lat: address.lat, lng: address.lng, geocodedText: address.geocodedText },
        }}
      />
      <form action={deleteAddressAction}>
        <input type="hidden" name="id" value={address.id} />
        <button type="submit" className={buttonClasses('danger', 'w-full')}>
          {t('delete')}
        </button>
      </form>
      <CustomerDock />
    </div>
  );
}
