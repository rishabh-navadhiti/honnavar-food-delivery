import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/shared/db/client';
import { dishes, kitchens } from '@/shared/db/schema';
import { makeKitchenWithMenu, truncateAll } from '@/shared/db/test/helpers';
import { eq } from 'drizzle-orm';
import { addToCart, setCartQuantity } from './cart';

beforeEach(truncateAll);

const now = new Date('2026-10-15T13:00:00+05:30');

describe('addToCart (FR-001, FR-006)', () => {
  it('adds an available dish from an open kitchen', async () => {
    const { kitchen, dishes: [dish] } = await makeKitchenWithMenu();
    const result = await addToCart(null, { dishId: dish.id }, now);
    expect(result).toEqual({ ok: true, data: { v: 1, kitchenId: kitchen.id, lines: [{ dishId: dish.id, qty: 1 }] } });
  });

  it('refuses an unavailable dish', async () => {
    const { dishes: [dish] } = await makeKitchenWithMenu();
    await db.update(dishes).set({ available: false }).where(eq(dishes.id, dish.id));
    expect(await addToCart(null, { dishId: dish.id }, now)).toMatchObject({ ok: false, error: { code: 'dish_unavailable' } });
  });

  it('refuses a closed or temporarily closed kitchen', async () => {
    const closed = await makeKitchenWithMenu({ open: false });
    expect(await addToCart(null, { dishId: closed.dishes[0].id }, now)).toMatchObject({ ok: false, error: { code: 'kitchen_closed' } });
    const paused = await makeKitchenWithMenu();
    await db
      .update(kitchens)
      .set({ closedAt: new Date(now.getTime() - 60_000), reopensAt: null })
      .where(eq(kitchens.id, paused.kitchen.id));
    expect(await addToCart(null, { dishId: paused.dishes[0].id }, now)).toMatchObject({ ok: false, error: { code: 'kitchen_closed' } });
  });

  it('refuses a dish of a kitchen customers cannot see, or an unknown dish', async () => {
    const hidden = await makeKitchenWithMenu({ overrides: { status: 'suspended', suspensionReason: 'Review' } });
    expect(await addToCart(null, { dishId: hidden.dishes[0].id }, now)).toMatchObject({ ok: false, error: { code: 'dish_unavailable' } });
    expect(await addToCart(null, { dishId: crypto.randomUUID() }, now)).toMatchObject({ ok: false, error: { code: 'dish_unavailable' } });
    expect(await addToCart(null, { dishId: 'nope' }, now)).toMatchObject({ ok: false, error: { code: 'invalid' } });
  });

  it('asks before replacing another kitchen’s cart, and replaces when told to', async () => {
    const a = await makeKitchenWithMenu();
    const b = await makeKitchenWithMenu();
    const first = await addToCart(null, { dishId: a.dishes[0].id }, now);
    if (!first.ok) throw new Error();
    expect(await addToCart(first.data, { dishId: b.dishes[0].id }, now)).toEqual({
      ok: false,
      error: { code: 'other_kitchen', details: { kitchenId: a.kitchen.id } },
    });
    expect(await addToCart(first.data, { dishId: b.dishes[0].id, replace: true }, now)).toMatchObject({
      ok: true,
      data: { kitchenId: b.kitchen.id, lines: [{ dishId: b.dishes[0].id, qty: 1 }] },
    });
  });
});

describe('setCartQuantity', () => {
  it('validates the quantity and returns the new cart', async () => {
    const { dishes: [dish] } = await makeKitchenWithMenu();
    const added = await addToCart(null, { dishId: dish.id }, now);
    if (!added.ok) throw new Error();
    expect(setCartQuantity(added.data, { dishId: dish.id, qty: 3 })).toMatchObject({ ok: true, data: { lines: [{ qty: 3 }] } });
    expect(setCartQuantity(added.data, { dishId: dish.id, qty: 0 })).toEqual({ ok: true, data: null });
    expect(setCartQuantity(added.data, { dishId: dish.id, qty: 21 })).toMatchObject({ ok: false, error: { code: 'invalid' } });
  });
});
