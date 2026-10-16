import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireSession } from '@/features/auth/session';
import { KitchenStateLabel } from '@/features/browse/components/kitchen-state-label';
import { ClosureControl } from '@/features/kitchens/components/closure-control';
import { StatusNotice } from '@/features/kitchens/components/status-notice';
import { getPartnerDashboard } from '@/features/kitchens/queries';
import { buttonClasses } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { LocalizedText } from '@/shared/ui/localized-text';

export default async function PartnerDashboardPage() {
  const session = await requireSession('partner');
  const t = await getTranslations('partner');
  const now = new Date();
  const dashboard = await getPartnerDashboard(session.kitchenId!, now);
  if (!dashboard) notFound();
  const { kitchen, state, missingTranslations } = dashboard;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-small font-semibold text-muted">{t('yourKitchen')}</p>
        <h1 className="text-title font-bold">
          <LocalizedText pair={{ en: kitchen.nameEn, kn: kitchen.nameKn }} />
        </h1>
      </div>
      <StatusNotice status={kitchen.status} reason={kitchen.suspensionReason} />
      <Card className="flex flex-col gap-2">
        <p className="text-small font-semibold text-muted">{t('customersSee')}</p>
        <KitchenStateLabel state={state} now={now} />
      </Card>
      <ClosureControl surface="partner" kitchenId={kitchen.id} state={state} now={now} />
      <Card className="flex flex-col gap-3">
        <p className="text-base" data-testid="missing-translations">
          {missingTranslations > 0 ? t('missingTranslations', { count: missingTranslations }) : t('allTranslated')}
        </p>
        {missingTranslations > 0 ? (
          <Link href="/partner/menu" className={buttonClasses('secondary', 'self-start')}>
            {t('fixTranslations')}
          </Link>
        ) : null}
      </Card>
    </div>
  );
}
