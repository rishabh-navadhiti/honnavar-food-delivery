import 'server-only';
import { and, eq, max } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { dishes, kitchens, menuCategories } from '@/shared/db/schema';
import { deleteImageIfUnused, storeImage } from '@/shared/images/store';
import { err, ok, type Result } from '@/shared/result';
import { parseInput } from '@/shared/validation';
import type { Actor } from '../../auth/actor-scope';
import { dishSchema, type DishInput } from '../schemas';
import { resolveKitchenScope, stampFor } from './scope';

async function dishInKitchen(kitchenId: string, dishId: string) {
  const [row] = await db
    .select()
    .from(dishes)
    .where(and(eq(dishes.id, dishId), eq(dishes.kitchenId, kitchenId)));
  return row ?? null;
}

async function nextPosition(categoryId: string): Promise<number> {
  const [last] = await db.select({ position: max(dishes.position) }).from(dishes).where(eq(dishes.categoryId, categoryId));
  return (last?.position ?? -1) + 1;
}

/**
 * Create or edit a dish (FR-034). Enforces the pure-veg rule (FR-035), stores photos through the
 * shared image path, and reports a missing language so the partner sees a reminder (FR-036).
 */
export async function saveDish(
  actor: Actor,
  input: DishInput,
): Promise<Result<{ id: string; missingLanguage?: 'en' | 'kn' }>> {
  const parsed = parseInput(dishSchema, input);
  if (!parsed.ok) return parsed;
  const d = parsed.data;
  const scope = resolveKitchenScope(actor, d.kitchenId);
  if (!scope.ok) return scope;
  const kitchenId = scope.data;

  const [kitchen] = await db.select({ pureVeg: kitchens.pureVeg }).from(kitchens).where(eq(kitchens.id, kitchenId));
  if (!kitchen) return err('not_found');
  const [category] = await db
    .select({ id: menuCategories.id })
    .from(menuCategories)
    .where(and(eq(menuCategories.id, d.categoryId), eq(menuCategories.kitchenId, kitchenId)));
  if (!category) return err('not_found');
  const existing = d.id ? await dishInKitchen(kitchenId, d.id) : null;
  if (d.id && !existing) return err('not_found');
  if (kitchen.pureVeg && !d.isVeg) return err('pure_veg_kitchen');

  let photoImageId = existing?.photoImageId ?? null;
  if (d.photo === null) photoImageId = null;
  if (d.photo) {
    const stored = await storeImage(d.photo);
    if (!stored.ok) return err('invalid', { photo: 'invalidImage' });
    photoImageId = stored.data.id;
  }

  const values = {
    categoryId: d.categoryId,
    nameEn: d.name.en,
    nameKn: d.name.kn,
    descriptionEn: d.description.en,
    descriptionKn: d.description.kn,
    priceRupees: d.priceRupees,
    isVeg: d.isVeg,
    available: d.available,
    photoImageId,
    ...stampFor(actor),
  };

  let id: string;
  if (existing) {
    const moved = existing.categoryId !== d.categoryId;
    await db
      .update(dishes)
      .set({ ...values, ...(moved ? { position: await nextPosition(d.categoryId) } : {}) })
      .where(eq(dishes.id, existing.id));
    id = existing.id;
    if (existing.photoImageId && existing.photoImageId !== photoImageId) await deleteImageIfUnused(existing.photoImageId);
  } else {
    const [row] = await db
      .insert(dishes)
      .values({ kitchenId, position: await nextPosition(d.categoryId), ...values })
      .returning({ id: dishes.id });
    id = row!.id;
  }

  const missingLanguage = !d.name.en ? 'en' : !d.name.kn ? 'kn' : undefined;
  return ok(missingLanguage ? { id, missingLanguage } : { id });
}

/** Switch a dish on or off without losing any of its details (FR-034). */
export async function setDishAvailable(
  actor: Actor,
  input: { kitchenId?: string | null; id: string; available: boolean },
): Promise<Result<object>> {
  const scope = resolveKitchenScope(actor, input.kitchenId);
  if (!scope.ok) return scope;
  const updated = await db
    .update(dishes)
    .set({ available: input.available, ...stampFor(actor) })
    .where(and(eq(dishes.id, input.id), eq(dishes.kitchenId, scope.data)))
    .returning({ id: dishes.id });
  return updated.length > 0 ? ok({}) : err('not_found');
}

export async function deleteDish(actor: Actor, input: { kitchenId?: string | null; id: string }): Promise<Result<object>> {
  const scope = resolveKitchenScope(actor, input.kitchenId);
  if (!scope.ok) return scope;
  const dish = await dishInKitchen(scope.data, input.id);
  if (!dish) return err('not_found');
  await db.delete(dishes).where(eq(dishes.id, dish.id));
  if (dish.photoImageId) await deleteImageIfUnused(dish.photoImageId);
  return ok({});
}

/** Set the order of all dishes in one category; `ids` must be exactly that set. */
export async function reorderDishes(
  actor: Actor,
  input: { kitchenId?: string | null; categoryId: string; ids: string[] },
): Promise<Result<object>> {
  const scope = resolveKitchenScope(actor, input.kitchenId);
  if (!scope.ok) return scope;
  const current = await db
    .select({ id: dishes.id })
    .from(dishes)
    .where(and(eq(dishes.categoryId, input.categoryId), eq(dishes.kitchenId, scope.data)));
  const known = new Set(current.map((c) => c.id));
  if (input.ids.length !== known.size || new Set(input.ids).size !== known.size || !input.ids.every((i) => known.has(i))) {
    return err('invalid', { _form: 'reorderMismatch' });
  }
  const stamp = stampFor(actor);
  await db.transaction(async (tx) => {
    for (const [position, id] of input.ids.entries()) {
      await tx.update(dishes).set({ position, ...stamp }).where(eq(dishes.id, id));
    }
  });
  return ok({});
}
