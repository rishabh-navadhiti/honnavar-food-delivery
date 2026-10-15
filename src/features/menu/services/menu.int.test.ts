import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/shared/db/client';
import { dishes, images, menuCategories } from '@/shared/db/schema';
import { partnerActor } from '@/shared/db/test/actors';
import { makeCategory, makeDish, makeKitchen, truncateAll } from '@/shared/db/test/helpers';
import { solidPng } from '@/shared/images/test-images';
import { deleteCategory, reorderCategories, saveCategory } from './categories';
import { deleteDish, reorderDishes, saveDish, setDishAvailable } from './dishes';

beforeEach(truncateAll);

const baseDish = (categoryId: string) => ({
  categoryId,
  name: { en: 'Kane fry', kn: 'ಕಾಣೆ ಫ್ರೈ' },
  description: {},
  priceRupees: 180,
  isVeg: false,
  available: true,
});

describe('categories (FR-033)', () => {
  it('requires a name in at least one language', async () => {
    const kitchen = await makeKitchen();
    const actor = await partnerActor(kitchen.id);
    expect(await saveCategory(actor, { name: { en: ' ', kn: '' } })).toEqual({
      ok: false,
      error: { code: 'invalid', fieldErrors: { name: 'nameRequired' } },
    });
  });

  it('creates at the end, renames, and stamps the partner', async () => {
    const kitchen = await makeKitchen();
    const actor = await partnerActor(kitchen.id);
    await makeCategory(kitchen.id, { position: 0 });
    const created = await saveCategory(actor, { name: { en: 'Sweets' } });
    if (!created.ok) throw new Error(created.error.code);
    const renamed = await saveCategory(actor, { id: created.data.id, name: { en: 'Sweets', kn: 'ಸಿಹಿ' } });
    expect(renamed.ok).toBe(true);
    const [row] = await db.select().from(menuCategories).where(eq(menuCategories.id, created.data.id));
    expect(row).toMatchObject({ nameKn: 'ಸಿಹಿ', position: 1, updatedByRole: 'partner', updatedByPhone: actor.phone });
  });

  it('will not delete a category that still has dishes', async () => {
    const kitchen = await makeKitchen();
    const actor = await partnerActor(kitchen.id);
    const category = await makeCategory(kitchen.id);
    await makeDish(kitchen.id, category.id);
    expect(await deleteCategory(actor, { id: category.id })).toEqual({ ok: false, error: { code: 'category_not_empty' } });
    await db.delete(dishes);
    expect((await deleteCategory(actor, { id: category.id })).ok).toBe(true);
  });

  it('reorders only with the exact set of the kitchen’s categories', async () => {
    const kitchen = await makeKitchen();
    const actor = await partnerActor(kitchen.id);
    const a = await makeCategory(kitchen.id, { position: 0 });
    const b = await makeCategory(kitchen.id, { position: 1 });
    expect((await reorderCategories(actor, { ids: [a.id] })).ok).toBe(false);
    expect((await reorderCategories(actor, { ids: [b.id, a.id] })).ok).toBe(true);
    const rows = await db.select().from(menuCategories);
    expect(rows.find((r) => r.id === b.id)!.position).toBe(0);
  });
});

describe('dishes (FR-034, FR-035)', () => {
  it('validates price as whole rupees between 1 and 100000', async () => {
    const kitchen = await makeKitchen();
    const actor = await partnerActor(kitchen.id);
    const category = await makeCategory(kitchen.id);
    for (const priceRupees of [0, 100001, 12.5]) {
      expect(await saveDish(actor, { ...baseDish(category.id), priceRupees })).toEqual({
        ok: false,
        error: { code: 'invalid', fieldErrors: { priceRupees: 'priceRange' } },
      });
    }
  });

  it('saves with one language and reports the missing one', async () => {
    const kitchen = await makeKitchen();
    const actor = await partnerActor(kitchen.id);
    const category = await makeCategory(kitchen.id);
    const result = await saveDish(actor, { ...baseDish(category.id), name: { en: 'Ambade upkari' } });
    expect(result.ok && result.data.missingLanguage).toBe('kn');
  });

  it('refuses a non-veg dish in a pure-veg kitchen', async () => {
    const kitchen = await makeKitchen({ pureVeg: true });
    const actor = await partnerActor(kitchen.id);
    const category = await makeCategory(kitchen.id);
    expect(await saveDish(actor, baseDish(category.id))).toEqual({ ok: false, error: { code: 'pure_veg_kitchen' } });
  });

  it('stores a photo and deletes the old one when replaced', async () => {
    const kitchen = await makeKitchen();
    const actor = await partnerActor(kitchen.id);
    const category = await makeCategory(kitchen.id);
    const first = await saveDish(actor, { ...baseDish(category.id), photo: await solidPng(640, 480) });
    if (!first.ok) throw new Error(first.error.code);
    expect(await db.$count(images)).toBe(1);
    await saveDish(actor, { ...baseDish(category.id), id: first.data.id, photo: await solidPng(700, 500) });
    expect(await db.$count(images)).toBe(1);
    await saveDish(actor, { ...baseDish(category.id), id: first.data.id, photo: null });
    expect(await db.$count(images)).toBe(0);
  });

  it('rejects an invalid photo', async () => {
    const kitchen = await makeKitchen();
    const actor = await partnerActor(kitchen.id);
    const category = await makeCategory(kitchen.id);
    expect(await saveDish(actor, { ...baseDish(category.id), photo: Buffer.from('nope') })).toEqual({
      ok: false,
      error: { code: 'invalid', fieldErrors: { photo: 'invalidImage' } },
    });
  });

  it('toggles availability without losing details, stamping the partner', async () => {
    const kitchen = await makeKitchen();
    const actor = await partnerActor(kitchen.id);
    const category = await makeCategory(kitchen.id);
    const dish = await makeDish(kitchen.id, category.id, { descriptionEn: 'Crispy' });
    expect((await setDishAvailable(actor, { id: dish.id, available: false })).ok).toBe(true);
    const [row] = await db.select().from(dishes).where(eq(dishes.id, dish.id));
    expect(row).toMatchObject({ available: false, descriptionEn: 'Crispy', updatedByRole: 'partner', updatedByPhone: actor.phone });
  });

  it('moves a dish to another category, reorders and deletes', async () => {
    const kitchen = await makeKitchen();
    const actor = await partnerActor(kitchen.id);
    const a = await makeCategory(kitchen.id);
    const b = await makeCategory(kitchen.id);
    const d1 = await makeDish(kitchen.id, a.id, { position: 0 });
    const d2 = await makeDish(kitchen.id, a.id, { position: 1 });
    expect((await reorderDishes(actor, { categoryId: a.id, ids: [d2.id, d1.id] })).ok).toBe(true);
    expect((await reorderDishes(actor, { categoryId: a.id, ids: [d2.id] })).ok).toBe(false);
    await saveDish(actor, { ...baseDish(b.id), id: d1.id, isVeg: true });
    const [moved] = await db.select().from(dishes).where(eq(dishes.id, d1.id));
    expect(moved!.categoryId).toBe(b.id);
    expect((await deleteDish(actor, { id: d2.id })).ok).toBe(true);
    expect(await db.$count(dishes)).toBe(1);
  });

  it('refuses to touch another kitchen’s dish (FR-030)', async () => {
    const own = await makeKitchen();
    const other = await makeKitchen();
    const actor = await partnerActor(own.id);
    const category = await makeCategory(other.id);
    const dish = await makeDish(other.id, category.id);
    expect((await setDishAvailable(actor, { id: dish.id, available: false })).ok).toBe(false);
    expect((await deleteDish(actor, { id: dish.id })).ok).toBe(false);
    expect((await saveDish(actor, baseDish(category.id))).ok).toBe(false);
    expect(await db.$count(dishes)).toBe(1);
  });
});
