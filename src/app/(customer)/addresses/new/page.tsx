import { getTranslations } from 'next-intl/server';
import { AddressFlow } from '@/features/addresses/components/address-flow';
import { requireSession } from '@/features/auth/session';
import { safeNext } from '@/features/auth/surfaces';
import { mapTiles } from '@/shared/maps/tiles';
import { CustomerTabBar } from '@/features/cart/components/customer-tab-bar';
import { addressBackHref } from '@/features/addresses/back-href';
import { BackLink } from '@/shared/ui/back-link';

type Props = { searchParams: Promise<{ next?: string | string[] }> };

export default async function NewAddressPage({ searchParams }: Props) {
  await requireSession('customer');
  const t = await getTranslations();
  const { next } = await searchParams;
  const nextPath = typeof next === 'string' ? next : undefined;
  return (
    <div className="flex flex-col gap-4">
      <BackLink href={addressBackHref(nextPath)} label={t('backLinks.back')} />
      <h1 className="text-title font-bold">{t('addresses.newTitle')}</h1>
      <AddressFlow tiles={mapTiles()} next={safeNext('customer', nextPath ?? '/addresses')} />
      <CustomerTabBar current="account" />
    </div>
  );
}
