import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { getOptionalSession } from '@/features/auth/session';
import { AppHeader } from '@/shared/ui/app-header';
import { buttonClasses } from '@/shared/ui/button';

export default async function CustomerLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('nav');
  const session = await getOptionalSession('customer');
  return (
    <>
      <AppHeader
        homeHref="/"
        actions={
          <Link href={session ? '/account' : '/login'} className={buttonClasses('ghost', 'px-3')}>
            {session ? t('account') : t('signIn')}
          </Link>
        }
      />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-4">{children}</main>
    </>
  );
}
