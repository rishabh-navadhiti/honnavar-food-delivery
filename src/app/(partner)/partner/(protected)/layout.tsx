import { CalendarDays, ClipboardList, Clock, ReceiptText, Store } from 'lucide-react';
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
      <main className="mx-auto w-full max-w-[752px] px-4 pb-28 pt-4">
        {/* The new-order alert runs on every partner screen (FR-029). */}
        <NewOrderAlert />
        {children}
        <div className="mt-8 flex justify-end">
          <SignOutButton surface="partner" />
        </div>
      </main>
      <NavLinks
        layout="bottom"
        ariaLabel={t('mainNavigation')}
        items={[
          { href: '/partner/orders', label: t('kitchenOrders'), icon: <ReceiptText aria-hidden="true" /> },
          { href: '/partner', label: t('dashboard'), icon: <CalendarDays aria-hidden="true" />, exact: true },
          { href: '/partner/menu', label: t('menu'), icon: <ClipboardList aria-hidden="true" /> },
          { href: '/partner/hours', label: t('hours'), icon: <Clock aria-hidden="true" /> },
          { href: '/partner/kitchen', label: t('kitchen'), icon: <Store aria-hidden="true" /> },
        ]}
      />
    </>
  );
}
