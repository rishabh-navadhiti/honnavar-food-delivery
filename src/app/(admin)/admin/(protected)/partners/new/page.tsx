import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireSession } from '@/features/auth/session';
import { KitchenProfileForm } from '@/features/kitchens/components/admin/kitchen-profile-form';
import { mapTiles } from '@/shared/maps/tiles';

export default async function AdminNewPartnerPage() {
  await requireSession('admin');
  const t = await getTranslations('admin');
  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/partners" className="inline-flex min-h-touch items-center gap-1 self-start text-base font-semibold text-primary-strong">
        <span aria-hidden="true">← </span>
        {t('backToPartners')}
      </Link>
      <h1 className="text-title font-bold">{t('newPartnerTitle')}</h1>
      <KitchenProfileForm mode="create" tiles={mapTiles()} />
    </div>
  );
}
