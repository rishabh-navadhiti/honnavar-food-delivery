import { ChevronRight, MapPin, MessageSquareText, ReceiptText } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { CustomerNameForm } from '@/features/auth/components/customer-name-form';
import Link from 'next/link';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { getCustomer } from '@/features/auth/queries';
import { requireSession } from '@/features/auth/session';
import { formatPhone } from '@/shared/i18n/format';
import { Card } from '@/shared/ui/card';
import { CustomerTabBar } from '@/features/cart/components/customer-tab-bar';

export default async function AccountPage() {
  const session = await requireSession('customer');
  const t = await getTranslations('account');
  const customer = await getCustomer(session.subjectId);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title font-bold">{t('title')}</h1>
      <nav aria-label={t('linksTitle')}>
        <ul className="flex flex-col divide-y divide-line rounded-lg bg-surface shadow-1">
          {(
            [
              ['messages', MessageSquareText],
              ['addresses', MapPin],
              ['orders', ReceiptText],
            ] as const
          ).map(([page, Icon]) => (
            <li key={page}>
              <Link href={`/${page}`} className="flex min-h-12 items-center gap-3 px-3 py-1.5 text-base font-semibold">
                <span className="grid size-8 place-items-center rounded-full bg-primary-soft text-primary-strong">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="flex-1">{t(`links.${page}`)}</span>
                <ChevronRight aria-hidden="true" className="size-5 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Card className="flex flex-col gap-4">
        <div>
          <p className="text-small font-semibold text-muted">{t('phone')}</p>
          <p className="text-heading font-semibold">{formatPhone(session.phone)}</p>
        </div>
        <CustomerNameForm displayName={customer?.displayName ?? ''} />
      </Card>
      <SignOutButton surface="customer" />
      <CustomerTabBar current="account" />
    </div>
  );
}
