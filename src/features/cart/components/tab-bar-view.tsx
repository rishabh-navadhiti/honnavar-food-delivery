import { ArrowRight, House, ReceiptText, ShoppingBag, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { isLocale } from '@/shared/i18n/config';
import { formatPrice } from '@/shared/i18n/format';
import type { OrderStatus } from '@/features/orders/domain/lifecycle';
import type { CustomerPage, TabBarState } from '../tab-bar-state';

const statusText: Record<OrderStatus, string> = {
  placed: 'text-status-placed',
  accepted: 'text-status-accepted',
  preparing: 'text-status-preparing',
  ready: 'text-status-ready',
  picked_up: 'text-status-picked',
  delivered: 'text-status-delivered',
  rejected: 'text-status-rejected',
  cancelled: 'text-status-cancelled',
};

/**
 * The customer tab bar (research R5, owner review): Home, Orders · status, Account. Labels are two
 * lines (word above, state below) in a fixed 72 px bar, so a state never moves the layout. Used by
 * CustomerTabBar (live state) and by loading, error and not-found pages (no state).
 */
export function TabBarView({ state, signedIn }: { state: TabBarState; signedIn: boolean }) {
  const t = useTranslations();
  return (
    <nav aria-label={t('nav.mainNavigation')} className="fixed inset-x-0 bottom-0 z-20 bg-surface pb-[env(safe-area-inset-bottom)] shadow-bar">
      <ul className="mx-auto grid h-tabbar max-w-3xl grid-cols-3 px-1">
        <Tab href="/" tab="home" active={state.active} icon={<House />} word={t('tabs.home')} />
        <Tab
          href={state.orders.href}
          tab="orders"
          active={state.active}
          icon={<ReceiptText />}
          word={t('tabs.orders')}
          dot={state.orders.state ? statusText[state.orders.state.status] : undefined}
          state={
            state.orders.state ? (
              <span data-testid="ongoing-strip" className={`font-bold ${statusText[state.orders.state.status]}`}>
                <span className="sr-only">
                  {t('ongoing.label')} {t('orders.number', { orderNo: String(state.orders.state.orderNo) })}{' '}
                </span>
                {t(`orderStatus.${state.orders.state.status}`)}
              </span>
            ) : null
          }
        />
        <Tab
          href={signedIn ? '/account' : '/login'}
          tab="account"
          active={state.active}
          icon={<UserRound />}
          word={signedIn ? t('tabs.account') : t('tabs.signIn')}
        />
      </ul>
    </nav>
  );
}

function Tab({
  href,
  tab,
  active,
  icon,
  word,
  state,
  dot,
}: {
  href: string;
  tab: CustomerPage;
  active: CustomerPage;
  icon: ReactNode;
  word: string;
  state?: ReactNode;
  dot?: string;
}) {
  const isActive = tab === active;
  return (
    <li className="min-w-0">
      <Link
        href={href}
        aria-current={isActive ? 'page' : undefined}
        className={`flex h-full min-h-touch flex-col items-center pt-1.5 text-caption ${isActive ? 'font-bold text-primary-strong' : 'font-semibold text-muted'}`}
      >
        <span
          className={`relative grid h-[26px] w-14 shrink-0 place-items-center rounded-full transition-colors duration-(--duration-fast) [&_svg]:size-[22px] [&_svg]:stroke-[1.9] ${isActive ? 'bg-primary-tint' : ''}`}
          aria-hidden="true"
        >
          {icon}
          {dot ? <span className={`absolute end-2.5 top-0.5 size-2 rounded-full bg-current shadow-[0_0_0_2px_var(--color-surface)] ${dot}`} /> : null}
        </span>
        <span className="stretch-dense flex max-w-full flex-col items-center leading-[var(--lh-snug)]">
          <span className="max-w-full whitespace-nowrap">{word}</span>
          {state ? <span className="max-w-full whitespace-nowrap">{state}</span> : null}
        </span>
      </Link>
    </li>
  );
}

/** The same bar without live state, for error and not-found pages (client boundaries). */
export function CustomerTabBarShell({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <TabBarView
      state={{ visible: true, active: 'home', orders: { href: '/orders', state: null }, cartButton: null, kitchenBar: null }}
      signedIn={signedIn}
    />
  );
}

/**
 * The floating cart button on tab pages while the cart has items (owner review): bottom-right above
 * the tab bar, the item count on it, opening the cart. Lists leave room for it.
 */
export function FloatingCartButton({ count, itemTotal }: { count: number; itemTotal: number }) {
  const t = useTranslations();
  const current = useLocale();
  return (
    <Link
      href="/cart"
      data-testid="header-cart"
      aria-label={`${t('tabs.cart')}: ${t('cart.itemCount', { count })}, ${formatPrice(itemTotal, isLocale(current) ? current : 'en')}`}
      className="fixed bottom-[calc(var(--spacing-tabbar)+0.75rem+env(safe-area-inset-bottom))] end-4 z-20 animate-sheet-up rounded-full bg-primary text-on-primary shadow-3 transition-transform duration-(--duration-fast) active:scale-95"
    >
      <span data-testid="cart-bar" className="flex h-14 min-w-14 items-center justify-center gap-2 px-4 text-heading font-bold">
        <ShoppingBag aria-hidden="true" className="size-6" />
        <span aria-hidden="true">{count}</span>
        <span className="sr-only">
          {t('cart.itemCount', { count })} {formatPrice(itemTotal, isLocale(current) ? current : 'en')}
        </span>
      </span>
    </Link>
  );
}

/** The kitchen page's bottom bar while the cart has items (owner review): count, ₹ total, "View cart". */
export function KitchenCartBar({ count, itemTotal }: { count: number; itemTotal: number }) {
  const t = useTranslations();
  const current = useLocale();
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 bg-surface px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-bar">
      <Link
        href="/cart"
        data-testid="header-cart"
        className="mx-auto flex min-h-[54px] max-w-[720px] animate-sheet-up items-center justify-between gap-3 rounded-md bg-primary px-4 text-on-primary shadow-2"
      >
        <span data-testid="cart-bar" className="flex items-center gap-2 text-base font-semibold">
          <ShoppingBag aria-hidden="true" className="size-5 shrink-0" />
          {t('cart.itemCount', { count })}
          <span aria-hidden="true">·</span>
          <span className="font-bold">{formatPrice(itemTotal, isLocale(current) ? current : 'en')}</span>
        </span>
        <span className="flex items-center gap-1 text-base font-bold">
          {t('cart.viewCart')}
          <ArrowRight aria-hidden="true" className="size-5" />
        </span>
      </Link>
    </div>
  );
}
