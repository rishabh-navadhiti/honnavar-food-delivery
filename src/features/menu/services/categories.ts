import 'server-only';
import { and, eq, max } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { dishes, menuCategories } from '@/shared/db/schema';
import { err, ok, type Result } from '@/shared/result';
import { parseInput } from '@/shared/validation';
import type { Actor } from '../../auth/actor-scope';
import { categorySchema } from '../schemas';
import { resolveKitchenScope, stampFor } from './scope';

type Ref = { kitchenId?: string | null; id: string };

async function categoryInKitchen(kitchenId: string, categoryId: string) {
  const [row] = await db
    .select()
    .from(menuCategories)
    .where(and(eq(menuCategories.id, categoryId), eq(menuCategories.kitchenId, kitchenId)));
  return row ?? null;
}

/** Create (at the end) or rename a category (FR-033). */
export async function saveCategory(
  actor: Actor,
  input: { kitchenId?: string | null; id?: string; name: { en?: string | null; kn?: string | null } },
): Promise<Result<{ id: string }>> {
  const parsed = parseInput(categorySchema, input);
  if (!parsed.ok) return parsed;
  const scope = resolveKitchenScope(actor, parsed.data.kitchenId);
  if (!scope.ok) return scope;
  const kitchenId = scope.data;
  const values = { nameEn: parsed.data.name.en, nameKn: parsed.data.name.kn, ...stampFor(actor) };

  if (parsed.data.id) {
    if (!(await categoryInKitchen(kitchenId, parsed.data.id))) return err('not_found');
    await db.update(menuCategories).set(values).where(eq(menuCategories.id, parsed.data.id));
    return ok({ id: parsed.data.id });
  }
  const [last] = await db
    .select({ position: max(menuCategories.position) })
    .from(menuCategories)
    .where(eq(menuCategories.kitchenId, kitchenId));
  const [row] = await db
    .insert(menuCategories)
    .values({ kitchenId, position: (last?.position ?? -1) + 1, ...values })
    .returning({ id: menuCategories.id });
  return ok({ id: row!.id });
}

/** A category that still contains dishes cannot be deleted (FR-033). */
export async function deleteCategory(actor: Actor, input: Ref): Promise<Result<object>> {
  const scope = resolveKitchenScope(actor, input.kitchenId);
  if (!scope.ok) return scope;
  if (!(await categoryInKitchen(scope.data, input.id))) return err('not_found');
  if ((await db.$count(dishes, eq(dishes.categoryId, input.id))) > 0) return err('category_not_empty');
  await db.delete(menuCategories).where(eq(menuCategories.id, input.id));
  return ok({});
}

/** Set the order of all of a kitchen's categories; `ids` must be exactly that set. */
export async function reorderCategories(
  actor: Actor,
  input: { kitchenId?: string | null; ids: string[] },
): Promise<Result<object>> {
  const scope = resolveKitchenScope(actor, input.kitchenId);
  if (!scope.ok) return scope;
  const current = await db
    .select({ id: menuCategories.id })
    .from(menuCategories)
    .where(eq(menuCategories.kitchenId, scope.data));
  const known = new Set(current.map((c) => c.id));
  if (input.ids.length !== known.size || new Set(input.ids).size !== known.size || !input.ids.every((i) => known.has(i))) {
    return err('invalid', { _form: 'reorderMismatch' });
  }
  const stamp = stampFor(actor);
  await db.transaction(async (tx) => {
    for (const [position, id] of input.ids.entries()) {
      await tx.update(menuCategories).set({ position, ...stamp }).where(eq(menuCategories.id, id));
    }
  });
  return ok({});
}
