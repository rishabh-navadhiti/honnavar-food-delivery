/**
 * The one polling mechanism for cross-role updates (FR-022, research R3). Pure scheduling, so it
 * can be tested with fake timers; `use-polling.ts` wires it to the page's visibility.
 */
export type Poller = { start(): void; stop(): void; onVisibilityChange(): void };

export function createPoller(options: { run: () => Promise<void>; intervalMs: number; isVisible: () => boolean }): Poller {
  const { run, intervalMs, isVisible } = options;
  let timer: ReturnType<typeof setInterval> | null = null;
  let inFlight = false;

  const tick = () => {
    if (inFlight || !isVisible()) return;
    inFlight = true;
    run()
      .catch(() => {
        // A failed refresh (slow or no network) leaves the last render on screen; the next tick retries.
      })
      .finally(() => {
        inFlight = false;
      });
  };

  return {
    start() {
      if (!timer) timer = setInterval(tick, intervalMs);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
    onVisibilityChange() {
      if (isVisible()) tick();
    },
  };
}
