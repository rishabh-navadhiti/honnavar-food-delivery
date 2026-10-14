import { eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import { requireSession } from '@/features/auth/session';
import { db } from '@/shared/db/client';
import { kitchens } from '@/shared/db/schema';
import { LocalizedText } from '@/shared/ui/localized-text';

export default async function PartnerHomePage() {
  const session = await requireSession('partner');
  const t = await getTranslations('partner');
  const [kitchen] = await db.select().from(kitchens).where(eq(kitchens.id, session.kitchenId!));
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-muted">{t('yourKitchen')}</p>
      <h1 className="text-2xl font-bold">
        {kitchen ? <LocalizedText pair={{ en: kitchen.nameEn, kn: kitchen.nameKn }} /> : null}
      </h1>
    </div>
  );
}
