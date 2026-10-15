import { sortedRanges, type WeekHours } from './hours';
import { addDays, istInstant, toIst } from './ist';

export type Period = { start: Date; end: Date };

/**
 * Concrete opening periods from the IST day containing `from`, for `days` days, in time order.
 * Periods that ended before `from` are included; callers filter as needed.
 */
export function periodsFrom(week: WeekHours, from: Date, days = 15): Period[] {
  const { weekday, dayStartUtcMs } = toIst(from);
  const periods: Period[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    for (const range of sortedRanges(week[addDays(weekday, offset)])) {
      periods.push({
        start: istInstant(dayStartUtcMs, offset, range.opens),
        end: istInstant(dayStartUtcMs, offset, range.closes),
      });
    }
  }
  return periods;
}
