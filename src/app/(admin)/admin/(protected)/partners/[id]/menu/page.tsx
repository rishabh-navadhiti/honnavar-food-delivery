import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireAdminKitchen } from '@/features/kitchens/admin-page-helpers';
import { MenuEditorPage } from '@/features/menu/components/editor-pages';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; missing?: string }> };

export default async function AdminMenuPage({ params, searchParams }: Props) {
  const kitchen = await requireAdminKitchen(params);
  const t = await getTranslations('admin');
  const { saved, missing } = await searchParams;
  const basePath = `/admin/partners/${kitchen.id}`;
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Link href={basePath} className="tap inline-flex items-center gap-1 self-start text-base font-semibold text-primary-strong">
        <span aria-hidden="true">← </span>
        {t('backToPartner')}
      </Link>
      <MenuEditorPage surface="admin" kitchenId={kitchen.id} basePath={basePath} saved={saved} missing={missing} />
    </div>
  );
}
