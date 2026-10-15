'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const STALE_AFTER_MS = 2000;

/**
 * The cart page must show what the cart cookie holds now, so the prices sent with "Place order"
 * match what the server reads. A render restored from browser history (Back/Forward) can be older
 * than the cookie; when it is, read the page again once.
 */
export function RefreshIfStale({ renderedAt }: { renderedAt: number }) {
  const router = useRouter();
  useEffect(() => {
    if (Date.now() - renderedAt > STALE_AFTER_MS) router.refresh();
  }, [renderedAt, router]);
  return null;
}
