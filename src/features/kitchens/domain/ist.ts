import type { Weekday } from './hours';

/** India Standard Time is UTC+05:30 all year (no daylight saving), so a fixed offset is exact. */
export const IST_OFFSET_MINUTES = 330;
const MINUTE = 60_000;
const DAY = 1440 * MINUTE;

export type IstMoment = { weekday: Weekday; minutes: number; dayStartUtcMs: number };

/** Where `instant` falls in IST: weekday, minutes after midnight, and that IST midnight as a UTC instant. */
export function toIst(instant: Date): IstMoment {
  const shifted = instant.getTime() + IST_OFFSET_MINUTES * MINUTE;
  const local = new Date(shifted);
  const weekday = (((local.getUTCDay() + 6) % 7) + 1) as Weekday;
  const msIntoDay = shifted - Math.floor(shifted / DAY) * DAY;
  const minutes = Math.floor(msIntoDay / MINUTE);
  const dayStartUtcMs = shifted - msIntoDay - IST_OFFSET_MINUTES * MINUTE;
  return { weekday, minutes, dayStartUtcMs };
}

/** The UTC instant for `minutes` after IST midnight, `dayOffset` days after the given IST day start. */
export function istInstant(dayStartUtcMs: number, dayOffset: number, minutes: number): Date {
  return new Date(dayStartUtcMs + dayOffset * DAY + minutes * MINUTE);
}

export function addDays(weekday: Weekday, offset: number): Weekday {
  return ((((weekday - 1 + offset) % 7) + 7) % 7 + 1) as Weekday;
}

/** Whole IST calendar days from `from` to `to` (0 = same IST day, 1 = next day). */
export function istDaysBetween(from: Date, to: Date): number {
  return Math.round((toIst(to).dayStartUtcMs - toIst(from).dayStartUtcMs) / DAY);
}
