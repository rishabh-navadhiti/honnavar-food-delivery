import { House, ReceiptText, ShoppingBag, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { isLocale } from '@/shared/i18n/config';
import { formatPrice } from '@/shared/i18n/format';
import type { OrderStatus } from '@/features/orders/domain/lifecycle';
import type { CustomerTab, TabBarState } from '../tab-bar-state';

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
 * The customer tab bar (research R5): Home, Orders · status, Cart · ₹total, Account. Labels are two
 * lines (word above, state below) in a fixed 72 px bar, so a state never moves the layout. Used by
 * CustomerTabBar (live state) and by loading, error and not-found pages (no state). Only the live bar
 * carries the test hooks, so a loading placeholder still on screen while a page streams in is never
 * mistaken for it.
 */
export function TabBarView({ state, signedIn, live = false }: { state: TabBarState; signedIn: boolean; live?: boolean }) {
  const t = useTranslations();
  const current = useLocale();
  const locale = isLocale(current) ? current : 'en';
  return (
    <nav aria-label={t('nav.mainNavigation')} className="fixed inset-x-0 bottom-0 z-20 bg-surface pb-[env(safe-area-inset-bottom)] shadow-bar">
      <ul className="mx-auto grid h-tabbar max-w-3xl grid-cols-4 px-1">
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
          href="/cart"
          tab="cart"
          active={state.active}
          icon={<ShoppingBag />}
          word={t('tabs.cart')}
          testId={live ? 'header-cart' : undefined}
          badge={state.cart ? state.cart.count : undefined}
          state={
            state.cart ? (
              <span data-testid="cart-bar" className="stretch-head text-small font-bold text-primary-strong">
                <span className="sr-only">{t('cart.itemCount', { count: state.cart.count })} </span>
                {formatPrice(state.cart.itemTotal, locale)}
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
  badge,
  dot,
  testId,
}: {
  href: string;
  tab: CustomerTab;
  active: CustomerTab;
  icon: ReactNode;
  word: string;
  state?: ReactNode;
  badge?: number;
  dot?: string;
  testId?: string;
}) {
  const isActive = tab === active;
  return (
    <li className="min-w-0">
      <Link
        href={href}
        aria-current={isActive ? 'page' : undefined}
        data-testid={testId}
        className={`flex h-full min-h-touch flex-col items-center pt-1.5 text-caption ${isActive ? 'font-bold text-primary-strong' : 'font-semibold text-muted'}`}
      >
        <span
          className={`relative grid h-[26px] w-14 shrink-0 place-items-center rounded-full transition-colors duration-(--duration-fast) [&_svg]:size-[22px] [&_svg]:stroke-[1.9] ${isActive ? 'bg-primary-tint' : ''}`}
          aria-hidden="true"
        >
          {icon}
          {badge !== undefined ? (
            <span className="absolute -top-1.5 end-1 min-w-5 rounded-full bg-primary px-1 text-center text-[0.75rem] font-bold leading-5 text-on-primary shadow-[0_0_0_2px_var(--color-surface)]">
              {badge}
            </span>
          ) : null}
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
  return <TabBarView state={{ visible: true, active: 'home', orders: { href: '/orders', state: null }, cart: null }} signedIn={signedIn} />;
}
