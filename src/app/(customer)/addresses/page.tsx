import { Pencil, Plus } from 'lucide-react';
import Link from 'next/link';
import { AddressLabel } from '@/features/addresses/components/address-label';
import { getTranslations } from 'next-intl/server';
import { listAddresses } from '@/features/addresses/queries';
import { requireSession } from '@/features/auth/session';
import { ButtonLink } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { CustomerTabBar } from '@/features/cart/components/customer-tab-bar';
import { BackLink } from '@/shared/ui/back-link';

export default async function AddressesPage() {
  const session = await requireSession('customer');
  const t = await getTranslations();
  const addresses = await listAddresses(session.subjectId);
  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/account" label={t('backLinks.account')} />
      <h1 className="text-title font-bold">{t('addresses.title')}</h1>
      {addresses.length === 0 ? (
        <EmptyState illustration="NoKitchens" title={t('addresses.empty')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {addresses.map((a) => (
            <li key={a.id}>
              <Card className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-bold">
                    <AddressLabel label={a.label} labelText={a.labelText} />
                  </p>
                  <p className="text-base">{a.house}</p>
                  <p className="text-small text-muted">{a.landmark}</p>
                </div>
                <Link href={`/addresses/${a.id}`} className="inline-flex min-h-touch shrink-0 items-center gap-1.5 px-1 text-base font-semibold text-primary-strong">
                  <Pencil aria-hidden="true" className="size-4" />
                  {t('common.edit')}
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <ButtonLink href="/addresses/new" variant="tonal" icon={<Plus aria-hidden="true" />}>
        {t('addresses.add')}
      </ButtonLink>
      <CustomerTabBar current="account" />
    </div>
  );
}
