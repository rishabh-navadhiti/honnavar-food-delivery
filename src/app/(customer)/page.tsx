import { getLocale, getTranslations } from 'next-intl/server';
import { KitchenCard } from '@/features/browse/components/kitchen-card';
import { listKitchensForCustomer } from '@/features/browse/queries';
import { isLocale } from '@/shared/i18n/config';
import { EmptyState } from '@/shared/ui/empty-state';

export default async function HomePage() {
  const t = await getTranslations('home');
  const current = await getLocale();
  const now = new Date();
  const kitchens = await listKitchensForCustomer({ now, locale: isLocale(current) ? current : 'en' });
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      {kitchens.length === 0 ? (
        <EmptyState title={t('emptyTitle')} body={t('emptyBody')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {kitchens.map((kitchen, index) => (
            <KitchenCard key={kitchen.id} kitchen={kitchen} now={now} priority={index < 2} />
          ))}
        </ul>
      )}
    </div>
  );
}
