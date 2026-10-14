import { hasAnyHours, type WeekHours } from './hours';
import { periodsFrom } from './periods';

export type Closure = { closedAt: Date | null; reopensAt: Date | null };

export type KitchenState =
  | { kind: 'open'; closesAt: Date }
  | { kind: 'closed'; nextOpening: Date }
  | { kind: 'hoursNotSet' }
  | { kind: 'temporarilyClosed'; reopensAt: Date | null };

export function isTemporarilyClosed(closure: Closure, now: Date): boolean {
  return closure.closedAt !== null && (closure.reopensAt === null || closure.reopensAt > now);
}

/** The customer-facing state of a kitchen at `now` (FR-039, FR-040). */
export function kitchenState(closure: Closure, week: WeekHours, now: Date): KitchenState {
  if (isTemporarilyClosed(closure, now)) {
    return { kind: 'temporarilyClosed', reopensAt: closure.reopensAt };
  }
  if (!hasAnyHours(week)) return { kind: 'hoursNotSet' };

  const periods = periodsFrom(week, now, 8);
  const current = periods.find((p) => p.start <= now && now < p.end);
  if (current) return { kind: 'open', closesAt: current.end };

  const next = periods.find((p) => p.start > now);
  // A week with any hours always has a next period within 8 days.
  return next ? { kind: 'closed', nextOpening: next.start } : { kind: 'hoursNotSet' };
}
