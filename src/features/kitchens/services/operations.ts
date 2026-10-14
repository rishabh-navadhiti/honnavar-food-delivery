import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { kitchenHours, kitchens } from '@/shared/db/schema';
import { err, ok, type Result } from '@/shared/result';
import { resolveKitchenScope, type Actor } from '../../auth/actor-scope';
import { closureEnd } from '../domain/closure';
import { WEEKDAYS } from '../domain/hours';
import { isTemporarilyClosed } from '../domain/state';
import { loadWeekHours } from '../queries';
import { parseWeekHours, type WeekHoursInput } from '../schemas';

type KitchenInput = { kitchenId?: string | null };

async function scopedKitchen(actor: Actor, input: KitchenInput) {
  const scope = resolveKitchenScope(actor, input.kitchenId);
  if (!scope.ok) return scope;
  const [row] = await db.select().from(kitchens).where(eq(kitchens.id, scope.data));
  return row ? ok(row) : err<typeof row & object>('not_found');
}

/** "Close for now": cancels the current or next opening period (FR-031). */
export async function closeTemporarily(
  actor: Actor,
  input: KitchenInput,
  now: Date = new Date(),
): Promise<Result<{ reopensAt: Date | null }>> {
  const kitchen = await scopedKitchen(actor, input);
  if (!kitchen.ok) return kitchen;
  if (isTemporarilyClosed(kitchen.data, now)) return err('already_closed');
  const week = (await loadWeekHours([kitchen.data.id])).get(kitchen.data.id)!;
  const reopensAt = closureEnd(week, now);
  await db
    .update(kitchens)
    .set({
      closedAt: now,
      reopensAt,
      closureUpdatedByRole: actor.role,
      closureUpdatedByPhone: actor.phone,
      closureUpdatedAt: now,
      updatedAt: now,
    })
    .where(eq(kitchens.id, kitchen.data.id));
  return ok({ reopensAt });
}

/** Reopen before the automatic reopening time. */
export async function reopen(actor: Actor, input: KitchenInput, now: Date = new Date()): Promise<Result<object>> {
  const kitchen = await scopedKitchen(actor, input);
  if (!kitchen.ok) return kitchen;
  if (!isTemporarilyClosed(kitchen.data, now)) return err('not_closed');
  await db
    .update(kitchens)
    .set({
      closedAt: null,
      reopensAt: null,
      closureUpdatedByRole: actor.role,
      closureUpdatedByPhone: actor.phone,
      closureUpdatedAt: now,
      updatedAt: now,
    })
    .where(eq(kitchens.id, kitchen.data.id));
  return ok({});
}

/** Replace the weekly hours; recalculate the reopening time of an active closure (edge case). */
export async function saveHours(
  actor: Actor,
  input: KitchenInput & { hours: WeekHoursInput },
  now: Date = new Date(),
): Promise<Result<object>> {
  const kitchen = await scopedKitchen(actor, input);
  if (!kitchen.ok) return kitchen;
  const week = parseWeekHours(input.hours);
  if (!week.ok) return week;
  const k = kitchen.data;
  const rows = WEEKDAYS.flatMap((weekday) =>
    week.data[weekday].map((r, i) => ({ kitchenId: k.id, weekday, slot: i + 1, opensMin: r.opens, closesMin: r.closes })),
  );
  await db.transaction(async (tx) => {
    await tx.delete(kitchenHours).where(eq(kitchenHours.kitchenId, k.id));
    if (rows.length > 0) await tx.insert(kitchenHours).values(rows);
    const stillClosed = k.closedAt !== null && isTemporarilyClosed(k, now);
    await tx
      .update(kitchens)
      .set({
        hoursUpdatedByRole: actor.role,
        hoursUpdatedByPhone: actor.phone,
        hoursUpdatedAt: now,
        updatedAt: now,
        ...(stillClosed ? { reopensAt: closureEnd(week.data, k.closedAt!) } : {}),
      })
      .where(eq(kitchens.id, k.id));
  });
  return ok({});
}
