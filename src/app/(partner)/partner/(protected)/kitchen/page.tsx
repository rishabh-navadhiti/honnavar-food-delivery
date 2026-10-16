import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireSession } from '@/features/auth/session';
import { KitchenProfile } from '@/features/kitchens/components/kitchen-profile';
import { getContacts, getKitchenRow, getSignins } from '@/features/kitchens/queries';

export default async function PartnerKitchenPage() {
  const session = await requireSession('partner');
  const t = await getTranslations('kitchenProfile');
  const kitchenId = session.kitchenId!;
  const [kitchen, contacts, signins] = await Promise.all([getKitchenRow(kitchenId), getContacts(kitchenId), getSignins(kitchenId)]);
  if (!kitchen) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title font-bold">{t('title')}</h1>
      <p className="text-base text-muted">{t('managedByTeam')}</p>
      <KitchenProfile kitchen={kitchen} contacts={contacts} signins={signins} />
    </div>
  );
}
