'use client';

import { RouteError } from '@/shared/ui/route-states';

export default function CustomerError({ reset }: { error: Error; reset: () => void }) {
  return <RouteError reset={reset} />;
}
