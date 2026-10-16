import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireAdminKitchen } from '@/features/kitchens/admin-page-helpers';
import { HoursEditorPage } from '@/features/menu/components/editor-pages';

type Props = { params: Promise<{ id: string }> };

export default async function AdminHoursPage({ params }: Props) {
  const kitchen = await requireAdminKitchen(params);
  const t = await getTranslations('admin');
  const basePath = `/admin/partners/${kitchen.id}`;
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Link href={basePath} className="inline-flex min-h-touch items-center gap-1 self-start text-base font-semibold text-primary-strong">
        <span aria-hidden="true">← </span>
        {t('backToPartner')}
      </Link>
      <HoursEditorPage surface="admin" kitchenId={kitchen.id} basePath={basePath} />
    </div>
  );
}
