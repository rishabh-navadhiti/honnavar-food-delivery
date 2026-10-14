import 'server-only';
import { inArray } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { kitchenHours } from '@/shared/db/schema';
import { emptyWeek, type Weekday, type WeekHours } from './domain/hours';

/** Weekly hours for each kitchen, in minutes, slots in order. Kitchens with no rows get an empty week. */
export async function loadWeekHours(kitchenIds: string[]): Promise<Map<string, WeekHours>> {
  const result = new Map<string, WeekHours>(kitchenIds.map((id) => [id, emptyWeek()]));
  if (kitchenIds.length === 0) return result;
  const rows = await db.select().from(kitchenHours).where(inArray(kitchenHours.kitchenId, kitchenIds));
  rows.sort((a, b) => a.slot - b.slot);
  for (const row of rows) {
    result.get(row.kitchenId)?.[row.weekday as Weekday].push({ opens: row.opensMin, closes: row.closesMin });
  }
  return result;
}
