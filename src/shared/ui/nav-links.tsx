'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type Item = { href: string; label: string; icon?: ReactNode; exact?: boolean };

/**
 * Navigation with the current page marked by aria-current, weight and a filled icon tile (not colour
 * alone). `bottom` is the phone tab bar (partner, agent); `top` is the admin bar (003).
 */
export function NavLinks({ items, layout, ariaLabel }: { items: Item[]; layout: 'bottom' | 'top'; ariaLabel: string }) {
  const pathname = usePathname();
  const isActive = (item: Item) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));

  if (layout === 'top') {
    return (
      <nav aria-label={ariaLabel}>
        <ul className="flex items-center gap-1">
          {items.map((item) => {
            const active = isActive(item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'inline-flex min-h-touch items-center gap-2 rounded-md px-3.5 text-base [&_svg]:size-5',
                    active ? 'bg-primary-soft font-bold text-primary-strong' : 'font-semibold text-muted hover:bg-surface-sunk',
                  ].join(' ')}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label={ariaLabel} className="fixed inset-x-0 bottom-0 z-20 bg-surface pb-[env(safe-area-inset-bottom)] shadow-bar">
      <ul className="mx-auto grid h-[66px] max-w-3xl auto-cols-fr grid-flow-col px-1">
        {items.map((item) => {
          const active = isActive(item);
          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex h-full min-h-touch flex-col items-center justify-center gap-0.5 text-caption',
                  active ? 'font-bold text-primary-strong' : 'font-semibold text-muted',
                ].join(' ')}
              >
                {item.icon ? (
                  <span
                    className={[
                      'grid h-[30px] w-14 place-items-center rounded-full transition-colors duration-(--duration-fast) [&_svg]:size-[22px]',
                      active ? 'bg-primary-tint' : '',
                    ].join(' ')}
                  >
                    {item.icon}
                  </span>
                ) : null}
                <span className="stretch-dense max-w-full truncate px-0.5" title={item.label} data-truncate>
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
