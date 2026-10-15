import { getTranslations } from 'next-intl/server';
import { CustomerNameForm } from '@/features/auth/components/customer-name-form';
import Link from 'next/link';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { getCustomer } from '@/features/auth/queries';
import { requireSession } from '@/features/auth/session';
import { formatPhone } from '@/shared/i18n/format';
import { Card } from '@/shared/ui/card';
import { CustomerDock } from '@/features/cart/components/customer-dock';

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
      <nav aria-label={t('linksTitle')}>
        <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
          {(['addresses', 'orders', 'messages'] as const).map((page) => (
            <li key={page}>
              <Link href={`/${page}`} className="flex min-h-touch items-center justify-between px-4 py-3 text-base font-semibold">
                {t(`links.${page}`)}
                <span aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <SignOutButton surface="customer" />
      <CustomerDock />
    </div>
  );
}
