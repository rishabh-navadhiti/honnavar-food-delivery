import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { requireSession } from '@/features/auth/session';
import { NewOrderAlert } from '@/features/orders/components/new-order-alert';
import { NavLinks } from '@/shared/ui/nav-links';

/** Drives navigation and sign-out only; every page calls requireSession('partner') itself. */
export default async function PartnerProtectedLayout({ children }: { children: ReactNode }) {
  await requireSession('partner');
  const t = await getTranslations('nav');
  return (
    <>
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-4">
        {/* The new-order alert runs on every partner screen (FR-029). */}
        <div className="mb-4">
          <NewOrderAlert />
        </div>
        {children}
        <div className="mt-8 flex justify-end">
          <SignOutButton surface="partner" />
        </div>
      </main>
      <NavLinks
        layout="bottom"
        ariaLabel={t('mainNavigation')}
        items={[
          { href: '/partner/orders', label: t('kitchenOrders') },
          { href: '/partner', label: t('dashboard'), exact: true },
          { href: '/partner/menu', label: t('menu') },
          { href: '/partner/hours', label: t('hours') },
          { href: '/partner/kitchen', label: t('kitchen') },
        ]}
      />
    </>
  );
}
