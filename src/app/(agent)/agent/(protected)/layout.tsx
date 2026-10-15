import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { requireSession } from '@/features/auth/session';
import { NavLinks } from '@/shared/ui/nav-links';

/** Drives navigation and sign-out only; every page calls requireSession('agent') itself. */
export default async function AgentProtectedLayout({ children }: { children: ReactNode }) {
  await requireSession('agent');
  const t = await getTranslations('nav');
  return (
    <>
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-4">
        {children}
        <div className="mt-8 flex justify-end">
          <SignOutButton surface="agent" />
        </div>
      </main>
      <NavLinks
        layout="bottom"
        ariaLabel={t('mainNavigation')}
        items={[
          { href: '/agent', label: t('deliveries'), exact: true },
          { href: '/agent/profile', label: t('profile') },
        ]}
      />
    </>
  );
}
