'use client';

import { CustomerTabBarShell } from '@/features/cart/components/tab-bar-view';
import { RouteError } from '@/shared/ui/route-states';

export default function CustomerError({ reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <RouteError reset={reset} />
      <CustomerTabBarShell />
    </>
  );
}
