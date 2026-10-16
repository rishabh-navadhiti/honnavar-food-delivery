import type { ReactNode } from 'react';

/**
 * The cart's fixed bottom bar (FR-013a, research R6): it replaces the tab bar while the cart has
 * items and holds the one next step, "Place order · ₹total" or "Sign in to check out".
 */
export function PlaceOrderBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 bg-surface pb-[env(safe-area-inset-bottom)] shadow-bar" data-testid="place-order-bar">
      <div className="mx-auto flex h-placebar max-w-3xl items-center px-4">{children}</div>
    </div>
  );
}
