'use client';

import { useEffect, useRef } from 'react';
import { createPoller } from './poller';

/** Runs `callback` every `intervalMs` while the tab is visible, and once on becoming visible again. */
export function usePolling(callback: () => Promise<void> | void, { intervalMs, enabled = true }: { intervalMs: number; enabled?: boolean }) {
  const latest = useRef(callback);
  useEffect(() => {
    latest.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    const poller = createPoller({
      run: async () => {
        await latest.current();
      },
      intervalMs,
      isVisible: () => document.visibilityState === 'visible',
    });
    poller.start();
    const onVisibility = () => poller.onVisibilityChange();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      poller.stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, enabled]);
}
