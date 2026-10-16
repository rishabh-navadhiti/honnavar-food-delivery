import { Bike, MessageSquareText, UserRound } from 'lucide-react';
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
      <main className="mx-auto w-full max-w-[752px] px-4 pb-28 pt-4">
        {children}
        <div className="mt-8 flex justify-end">
          <SignOutButton surface="agent" />
        </div>
      </main>
      <NavLinks
        layout="bottom"
        ariaLabel={t('mainNavigation')}
        items={[
          { href: '/agent', label: t('deliveries'), icon: <Bike aria-hidden="true" />, exact: true },
          { href: '/agent/messages', label: t('messages'), icon: <MessageSquareText aria-hidden="true" /> },
          { href: '/agent/profile', label: t('profile'), icon: <UserRound aria-hidden="true" /> },
        ]}
      />
    </>
  );
}
