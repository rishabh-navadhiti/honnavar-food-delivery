'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Item = { href: string; label: string; exact?: boolean };

/** Navigation with the current page marked by aria-current, weight and an underline (not colour alone). */
export function NavLinks({ items, layout, ariaLabel }: { items: Item[]; layout: 'bottom' | 'side'; ariaLabel: string }) {
  const pathname = usePathname();
  const isActive = (item: Item) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));
  const container =
    layout === 'bottom'
      ? 'fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface'
      : 'flex flex-col gap-1';
  const list = layout === 'bottom' ? 'mx-auto grid max-w-5xl grid-flow-col auto-cols-fr' : 'flex flex-col gap-1';
  return (
    <nav aria-label={ariaLabel} className={container}>
      <ul className={list}>
        {items.map((item) => {
          const active = isActive(item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex min-h-touch items-center justify-center px-3 text-sm',
                  layout === 'side' ? 'justify-start rounded-lg' : '',
                  active ? 'font-bold text-primary underline decoration-2 underline-offset-4' : 'text-ink',
                ].join(' ')}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
