import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { listAddresses } from '@/features/addresses/queries';
import { requireSession } from '@/features/auth/session';
import { ButtonLink } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';

export default async function AddressesPage() {
  const session = await requireSession('customer');
  const t = await getTranslations();
  const addresses = await listAddresses(session.subjectId);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t('addresses.title')}</h1>
      {addresses.length === 0 ? (
        <EmptyState title={t('addresses.empty')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {addresses.map((a) => (
            <li key={a.id}>
              <Card className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-bold">{t(`addressLabel.${a.label}`)}</p>
                  <p className="text-base">{a.house}</p>
                  <p className="text-sm text-muted">{a.landmark}</p>
                </div>
                <Link href={`/addresses/${a.id}`} className="min-h-touch shrink-0 py-3 text-base font-semibold text-primary">
                  {t('common.edit')}
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <ButtonLink href="/addresses/new">{t('addresses.add')}</ButtonLink>
    </div>
  );
}
