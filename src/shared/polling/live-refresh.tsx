'use client';

import { useRouter } from 'next/navigation';
import { usePolling } from './use-polling';

export const POLL_INTERVAL_MS = 10_000;

/**
 * Re-renders the current route's Server Components every 10 s while visible (research R3), without
 * a full reload: scroll position, open dialogs and typed input survive.
 */
export function LiveRefresh({ enabled = true }: { enabled?: boolean }) {
  const router = useRouter();
  usePolling(() => router.refresh(), { intervalMs: POLL_INTERVAL_MS, enabled });
  return null;
}
