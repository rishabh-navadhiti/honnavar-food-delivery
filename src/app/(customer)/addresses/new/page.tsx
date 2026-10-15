import { getTranslations } from 'next-intl/server';
import { AddressFlow } from '@/features/addresses/components/address-flow';
import { requireSession } from '@/features/auth/session';
import { safeNext } from '@/features/auth/surfaces';
import { mapTiles } from '@/shared/maps/tiles';

type Props = { searchParams: Promise<{ next?: string | string[] }> };

export default async function NewAddressPage({ searchParams }: Props) {
  await requireSession('customer');
  const t = await getTranslations('addresses');
  const { next } = await searchParams;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t('newTitle')}</h1>
      <AddressFlow tiles={mapTiles()} next={safeNext('customer', typeof next === 'string' ? next : '/addresses')} />
    </div>
  );
}
