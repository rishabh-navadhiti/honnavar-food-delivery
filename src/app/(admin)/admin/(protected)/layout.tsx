import { Bike, ReceiptText, Store } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { requireSession } from '@/features/auth/session';
import { NavLinks } from '@/shared/ui/nav-links';

/**
 * Desktop-first (003): navigation in a bar under the header, so the board gets the full width.
 * Drives navigation and sign-out only; every page calls requireSession('admin') itself.
 */
export default async function AdminProtectedLayout({ children }: { children: ReactNode }) {
  await requireSession('admin');
  const t = await getTranslations('nav');
  return (
    <>
      <div className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-6">
          <NavLinks
            layout="top"
            ariaLabel={t('mainNavigation')}
            items={[
              { href: '/admin/orders', label: t('kitchenOrders'), icon: <ReceiptText aria-hidden="true" /> },
              { href: '/admin/partners', label: t('partners'), icon: <Store aria-hidden="true" /> },
              { href: '/admin/agents', label: t('agents'), icon: <Bike aria-hidden="true" /> },
            ]}
          />
          <SignOutButton surface="admin" />
        </div>
      </div>
      <main className="mx-auto w-full max-w-[1440px] px-6 py-5">{children}</main>
    </>
  );
}
