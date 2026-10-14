import { getTranslations } from 'next-intl/server';
import { requireSession } from '@/features/auth/session';

export default async function AdminPartnersPage() {
  await requireSession('admin');
  const t = await getTranslations('admin');
  return <h1 className="text-2xl font-bold">{t('partnersTitle')}</h1>;
}
