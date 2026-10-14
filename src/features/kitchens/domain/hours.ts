/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7];

/** Minutes after midnight IST. `closes` may be 1440 (midnight); ranges never cross midnight. */
export type Range = { opens: number; closes: number };
export type WeekHours = Record<Weekday, Range[]>;
export type HoursError = 'range_order' | 'range_overlap' | 'too_many_ranges';

export const MAX_RANGES_PER_DAY = 2;

export function emptyWeek(): WeekHours {
  return { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
}

/** "HH:MM" → minutes after midnight, allowing "24:00". Null when malformed. */
export function toMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59 || hours > 24 || (hours === 24 && minutes !== 0)) return null;
  return hours * 60 + minutes;
}

export function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Returns one error code per invalid day; an empty object means the week is valid. */
export function validateWeekHours(week: WeekHours): Partial<Record<Weekday, HoursError>> {
  const errors: Partial<Record<Weekday, HoursError>> = {};
  for (const day of WEEKDAYS) {
    const ranges = week[day];
    if (ranges.length > MAX_RANGES_PER_DAY) {
      errors[day] = 'too_many_ranges';
      continue;
    }
    if (ranges.some((r) => !(r.opens >= 0 && r.closes <= 1440 && r.opens < r.closes))) {
      errors[day] = 'range_order';
      continue;
    }
    const [a, b] = ranges;
    if (a && b && a.opens < b.closes && b.opens < a.closes) errors[day] = 'range_overlap';
  }
  return errors;
}

/** Sorted copy of a day's ranges. */
export function sortedRanges(ranges: Range[]): Range[] {
  return [...ranges].sort((x, y) => x.opens - y.opens);
}

export function hasAnyHours(week: WeekHours): boolean {
  return WEEKDAYS.some((day) => week[day].length > 0);
}
