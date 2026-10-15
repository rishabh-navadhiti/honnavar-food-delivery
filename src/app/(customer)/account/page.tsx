import { getTranslations } from 'next-intl/server';
import { CustomerNameForm } from '@/features/auth/components/customer-name-form';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { getCustomer } from '@/features/auth/queries';
import { requireSession } from '@/features/auth/session';
import { formatPhone } from '@/shared/i18n/format';
import { Card } from '@/shared/ui/card';

export default async function AccountPage() {
  const session = await requireSession('customer');
  const t = await getTranslations('account');
  const customer = await getCustomer(session.subjectId);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <Card className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-muted">{t('phone')}</p>
          <p className="text-lg font-semibold">{formatPhone(session.phone)}</p>
        </div>
        <CustomerNameForm displayName={customer?.displayName ?? ''} />
      </Card>
      <SignOutButton surface="customer" />
    </div>
  );
}
