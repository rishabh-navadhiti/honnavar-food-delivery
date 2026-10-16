import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { requireSession } from '@/features/auth/session';
import { NavLinks } from '@/shared/ui/nav-links';

/** Desktop-first. Drives navigation and sign-out only; every page calls requireSession('admin') itself. */
export default async function AdminProtectedLayout({ children }: { children: ReactNode }) {
  await requireSession('admin');
  const t = await getTranslations('nav');
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row">
      <aside className="md:w-56 md:shrink-0">
        <NavLinks
          layout="top"
          ariaLabel={t('mainNavigation')}
          items={[
            { href: '/admin/orders', label: t('kitchenOrders') },
            { href: '/admin/partners', label: t('partners') },
            { href: '/admin/agents', label: t('agents') },
          ]}
        />
        <div className="mt-4">
          <SignOutButton surface="admin" />
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
