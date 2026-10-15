/** The kitchen's acceptance window (FR-020). Pure; lazy expiry uses it (research R5). */

const MINUTE = 60_000;

export function acceptDeadline(placedAt: Date, windowMinutes: number): Date {
  return new Date(placedAt.getTime() + windowMinutes * MINUTE);
}

/** Overdue only after the deadline has passed; exactly at the deadline the kitchen can still act. */
export function isOverdue(placedAt: Date, now: Date, windowMinutes: number): boolean {
  return now.getTime() > acceptDeadline(placedAt, windowMinutes).getTime();
}

export function timeLeftMs(placedAt: Date, now: Date, windowMinutes: number): number {
  return Math.max(0, acceptDeadline(placedAt, windowMinutes).getTime() - now.getTime());
}
