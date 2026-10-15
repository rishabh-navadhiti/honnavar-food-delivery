import { istInstant, toIst } from '@/features/kitchens/domain/ist';

/** "Today" for day views, boards and agent totals: the IST calendar day containing `now`. */
export function istDayBounds(now: Date): { start: Date; end: Date } {
  const { dayStartUtcMs } = toIst(now);
  return { start: istInstant(dayStartUtcMs, 0, 0), end: istInstant(dayStartUtcMs, 1, 0) };
}
