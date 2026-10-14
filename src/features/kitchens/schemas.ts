import { z } from 'zod';
import { err, ok, type Result } from '@/shared/result';
import { emptyWeek, toMinutes, validateWeekHours, WEEKDAYS, type WeekHours } from './domain/hours';

export const kitchenIdInput = z.uuid().nullish();

export type RangeInput = { opens: string; closes: string };
/** Weekly hours as entered: keys "1" (Monday) to "7" (Sunday), each 0–2 "HH:MM" ranges. */
export type WeekHoursInput = Partial<Record<string, RangeInput[]>>;

const errorKeys = { range_order: 'rangeOrder', range_overlap: 'rangeOverlap', too_many_ranges: 'tooManyRanges' } as const;

/** Parse entered hours into minutes, with one error key per invalid day at `hours.<day>` (FR-032). */
export function parseWeekHours(input: WeekHoursInput): Result<WeekHours> {
  const week = emptyWeek();
  const fieldErrors: Record<string, string> = {};
  for (const day of WEEKDAYS) {
    const ranges = input[String(day)] ?? [];
    const converted = ranges.map((r) => ({ opens: toMinutes(r.opens), closes: toMinutes(r.closes) }));
    if (converted.some((r) => r.opens === null || r.closes === null)) {
      fieldErrors[`hours.${day}`] = 'invalidTime';
      continue;
    }
    week[day] = converted as { opens: number; closes: number }[];
  }
  for (const [day, code] of Object.entries(validateWeekHours(week))) {
    fieldErrors[`hours.${day}`] ??= errorKeys[code];
  }
  return Object.keys(fieldErrors).length > 0 ? err('invalid', fieldErrors) : ok(week);
}
