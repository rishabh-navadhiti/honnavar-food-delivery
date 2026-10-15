import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { getOptionalSession } from '@/features/auth/session';
import { cartCount } from '@/features/cart/domain/cart';
import { readCart } from '@/features/cart/cookie';
import { AppHeader } from '@/shared/ui/app-header';
import { buttonClasses } from '@/shared/ui/button';

export default async function CustomerLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations();
  const session = await getOptionalSession('customer');
  const count = cartCount(await readCart());
  const navLink = 'flex min-h-touch items-center gap-1.5 px-3 text-base font-semibold text-ink';
  return (
    <>
      <AppHeader
        homeHref="/"
        actions={
          <Link href={session ? '/account' : '/login'} className={buttonClasses('ghost', 'whitespace-nowrap px-3')}>
            {session ? t('nav.account') : t('nav.signIn')}
          </Link>
        }
      />
      {/* Orders and the cart are reachable from every customer screen (FR-024). */}
      <nav aria-label={t('nav.customerNavigation')} className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-2">
          <Link href="/orders" className={navLink}>
            {t('nav.orders')}
          </Link>
          <Link href="/cart" className={navLink} data-testid="header-cart">
            {t('nav.cart')}
            {count > 0 ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-sm font-bold text-on-primary" aria-label={t('cart.itemCount', { count })}>
                {count}
              </span>
            ) : null}
          </Link>
        </div>
      </nav>
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-4">{children}</main>
    </>
  );
}
