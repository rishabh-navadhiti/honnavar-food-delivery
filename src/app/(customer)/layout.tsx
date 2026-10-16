import type { ReactNode } from 'react';
import { AppHeader } from '@/shared/ui/app-header';

/**
 * Customer chrome (003, FR-013): one slim top bar here, and one bottom tab bar that each page
 * renders with its own live state (CustomerTabBar, research R5). Content clears the bottom bar and
 * the floating cart button above it, so the button covers nothing.
 */
export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppHeader homeHref="/" />
      <main className="mx-auto w-full max-w-[512px] md:has-[[data-wide]]:max-w-[752px] px-4 pb-[calc(var(--spacing-tabbar)+5.5rem)] pt-4">{children}</main>
    </>
  );
}
