import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { requireAdminKitchen } from '@/features/kitchens/admin-page-helpers';
import { ClosureControl } from '@/features/kitchens/components/closure-control';
import { KitchenProfileForm } from '@/features/kitchens/components/admin/kitchen-profile-form';
import { mapTiles } from '@/shared/maps/tiles';
import { PhotoForm } from '@/features/kitchens/components/admin/photo-form';
import { SigninList } from '@/features/kitchens/components/admin/signin-list';
import { StatusPanel } from '@/features/kitchens/components/admin/status-panel';
import { VerificationPanel } from '@/features/kitchens/components/admin/verification-panel';
import { kitchenState } from '@/features/kitchens/domain/state';
import { getContacts, getSignins, getVerification, loadWeekHours } from '@/features/kitchens/queries';
import { isLocale } from '@/shared/i18n/config';
import { formatDayTime } from '@/shared/i18n/format';
import { buttonClasses } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { LocalizedText } from '@/shared/ui/localized-text';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> };

export default async function AdminPartnerPage({ params, searchParams }: Props) {
  const kitchen = await requireAdminKitchen(params);
  const t = await getTranslations('admin');
  const current = await getLocale();
  const locale = isLocale(current) ? current : 'en';
  const { created } = await searchParams;
  const now = new Date();
  const [contacts, signins, verification, hours] = await Promise.all([
    getContacts(kitchen.id),
    getSignins(kitchen.id),
    getVerification(kitchen.id),
    loadWeekHours([kitchen.id]),
  ]);
  const state = kitchenState({ closedAt: kitchen.closedAt, reopensAt: kitchen.reopensAt }, hours.get(kitchen.id)!, now);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/partners" className="text-primary">
        <span aria-hidden="true">← </span>
        {t('backToPartners')}
      </Link>
      <h1 className="text-2xl font-bold">
        <LocalizedText pair={{ en: kitchen.nameEn, kn: kitchen.nameKn }} />
      </h1>
      {created ? (
        <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3">
          {t('created')}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Link href={`/admin/partners/${kitchen.id}/menu`} className={buttonClasses('secondary')}>
          {t('editMenu')}
        </Link>
        <Link href={`/admin/partners/${kitchen.id}/hours`} className={buttonClasses('secondary')}>
          {t('editHours')}
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <StatusPanel kitchenId={kitchen.id} status={kitchen.status} reason={kitchen.suspensionReason} />
        <VerificationPanel
          kitchenId={kitchen.id}
          kind={kitchen.type === 'home_kitchen' ? 'hygiene_check' : 'fssai_licence'}
          recorded={verification ? { reference: verification.reference, when: formatDayTime(verification.verifiedAt, locale) } : null}
        />
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">{t('closureTitle')}</h2>
          <ClosureControl surface="admin" kitchenId={kitchen.id} state={state} now={now} />
        </div>
        <SigninList kitchenId={kitchen.id} signins={signins} />
        <PhotoForm kitchenId={kitchen.id} hasPhoto={Boolean(kitchen.photoImageId)} />
      </div>
      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">{t('profileTitle')}</h2>
        <KitchenProfileForm mode="edit" kitchenId={kitchen.id} profile={{ ...kitchen, contacts }} tiles={mapTiles()} />
      </Card>
    </div>
  );
}
