import type { WeekHours } from './hours';
import { periodsFrom } from './periods';

/**
 * When a temporary closure made at `closedAt` ends (FR-031).
 * It cancels exactly one opening period: the one running at `closedAt` or, if none is running,
 * the next upcoming one. The kitchen reopens at the start of the period after that.
 * Returns null when there is no such period (the closure lasts until someone reopens).
 */
export function closureEnd(week: WeekHours, closedAt: Date): Date | null {
  const periods = periodsFrom(week, closedAt, 15);
  const cancelledIndex = periods.findIndex((p) => p.end > closedAt);
  if (cancelledIndex === -1) return null;
  const following = periods[cancelledIndex + 1];
  return following ? following.start : null;
}
