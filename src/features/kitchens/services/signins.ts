import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { kitchens, kitchenSignins, sessions } from '@/shared/db/schema';
import { err, ok, type Result } from '@/shared/result';
import { parseInput } from '@/shared/validation';
import type { Actor } from '../../auth/actor-scope';
import { signinSchema } from '../admin-schemas';
import { requireAdmin, signinOwner } from './admin';

/** Add an owner or helper number to a kitchen's sign-in list (FR-053). */
export async function addSignin(
  actor: Actor,
  input: { kitchenId: string; phone: string; personName: string },
): Promise<Result<{ id: string }>> {
  const admin = requireAdmin(actor);
  if (!admin.ok) return admin;
  const parsed = parseInput(signinSchema, input);
  if (!parsed.ok) return parsed;
  const [kitchen] = await db.select({ id: kitchens.id }).from(kitchens).where(eq(kitchens.id, input.kitchenId));
  if (!kitchen) return err('not_found');
  const taken = await signinOwner([parsed.data.phone]);
  if (taken !== null) return err('signin_phone_taken', undefined, { kitchenName: taken });
  const [row] = await db
    .insert(kitchenSignins)
    .values({ kitchenId: input.kitchenId, ...parsed.data })
    .returning({ id: kitchenSignins.id });
  return ok({ id: row!.id });
}

/** Remove a number from the sign-in list and end its partner sessions; the last number stays. */
export async function removeSignin(actor: Actor, input: { kitchenId: string; signinId: string }): Promise<Result<object>> {
  const admin = requireAdmin(actor);
  if (!admin.ok) return admin;
  const rows = await db.select({ id: kitchenSignins.id }).from(kitchenSignins).where(eq(kitchenSignins.kitchenId, input.kitchenId));
  if (!rows.some((r) => r.id === input.signinId)) return err('not_found');
  if (rows.length <= 1) return err('last_signin');
  await db.transaction(async (tx) => {
    await tx.delete(kitchenSignins).where(eq(kitchenSignins.id, input.signinId));
    await tx.delete(sessions).where(and(eq(sessions.surface, 'partner'), eq(sessions.subjectId, input.signinId)));
  });
  return ok({});
}
