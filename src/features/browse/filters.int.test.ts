import { beforeEach, describe, expect, it } from 'vitest';
import { makeCategory, makeDish, makeKitchen, truncateAll } from '@/shared/db/test/helpers';
import { getKitchenForCustomer, listKitchensForCustomer, searchForCustomer } from './queries';

beforeEach(truncateAll);

const NOON = new Date('2026-10-12T12:00:00+05:30');

async function seed() {
  const vegRestaurant = await makeKitchen({ nameEn: 'Veg Restaurant', nameKn: 'ಸಸ್ಯ ಹೋಟೆಲ್', type: 'restaurant', pureVeg: true });
  const vc = await makeCategory(vegRestaurant.id, { nameEn: 'Breakfast' });
  await makeDish(vegRestaurant.id, vc.id, { nameEn: 'Neer dose', nameKn: 'ನೀರ್ ದೋಸೆ', isVeg: true });

  const fishHome = await makeKitchen({ nameEn: 'Fish Home', type: 'home_kitchen' });
  const fishCat = await makeCategory(fishHome.id, { nameEn: 'Fish', position: 0 });
  const vegCat = await makeCategory(fishHome.id, { nameEn: 'Veg', position: 1 });
  await makeDish(fishHome.id, fishCat.id, { nameEn: 'Kane fry', nameKn: 'ಕಾಣೆ ಫ್ರೈ', isVeg: false });
  await makeDish(fishHome.id, vegCat.id, { nameEn: 'Neer dose', nameKn: 'ನೀರ್ ದೋಸೆ', isVeg: true, available: false });

  const closedCloud = await makeKitchen({
    nameEn: 'Closed Cloud',
    type: 'cloud_kitchen',
    closedAt: new Date('2026-10-12T11:30:00+05:30'),
    reopensAt: new Date('2026-10-12T18:00:00+05:30'),
  });
  const cc = await makeCategory(closedCloud.id);
  await makeDish(closedCloud.id, cc.id, { nameEn: 'Chicken biryani', nameKn: 'ಚಿಕನ್ ಬಿರಿಯಾನಿ', isVeg: false });

  const hidden = await makeKitchen({ nameEn: 'Pending Neer Place', status: 'pending' });
  const hc = await makeCategory(hidden.id);
  await makeDish(hidden.id, hc.id, { nameEn: 'Neer dose special', isVeg: true });
  return { vegRestaurant, fishHome, closedCloud };
}

const names = (list: { name: { en?: string | null } }[]) => list.map((k) => k.name.en).sort();

describe('kitchen filters (FR-042)', () => {
  it('filters by type, pure veg and open now, combined', async () => {
    await seed();
    expect(names(await listKitchensForCustomer({ now: NOON, locale: 'en', type: 'home_kitchen' }))).toEqual(['Fish Home']);
    expect(names(await listKitchensForCustomer({ now: NOON, locale: 'en', pureVeg: true }))).toEqual(['Veg Restaurant']);
    expect(names(await listKitchensForCustomer({ now: NOON, locale: 'en', openNow: true }))).toEqual(['Fish Home', 'Veg Restaurant']);
    expect(await listKitchensForCustomer({ now: NOON, locale: 'en', openNow: true, type: 'cloud_kitchen' })).toEqual([]);
  });
});

describe('dish filter on the home list (FR-043)', () => {
  it('veg only needs an available veg dish; non-veg only needs an available non-veg dish', async () => {
    await seed();
    expect(names(await listKitchensForCustomer({ now: NOON, locale: 'en', dishFilter: 'veg' }))).toEqual(['Veg Restaurant']);
    expect(names(await listKitchensForCustomer({ now: NOON, locale: 'en', dishFilter: 'nonveg' }))).toEqual([
      'Closed Cloud',
      'Fish Home',
    ]);
    expect((await listKitchensForCustomer({ now: NOON, locale: 'en', dishFilter: 'all' })).length).toBe(3);
    expect(await listKitchensForCustomer({ now: NOON, locale: 'en', pureVeg: true, dishFilter: 'nonveg' })).toEqual([]);
  });
});

describe('dish filter on a kitchen page', () => {
  it('shows only matching dishes, keeps unavailable matches, hides empty categories', async () => {
    const { fishHome } = await seed();
    const veg = await getKitchenForCustomer(fishHome.id, { now: NOON, dishFilter: 'veg' });
    expect(veg?.categories.map((c) => [c.name.en, c.dishes.map((d) => [d.name.en, d.available])])).toEqual([
      ['Veg', [['Neer dose', false]]],
    ]);
    expect(veg?.noMatchingDishes).toBe(false);
  });

  it('reports when nothing matches', async () => {
    const { vegRestaurant } = await seed();
    const result = await getKitchenForCustomer(vegRestaurant.id, { now: NOON, dishFilter: 'nonveg' });
    expect(result?.categories).toEqual([]);
    expect(result?.noMatchingDishes).toBe(true);
  });
});

describe('searchForCustomer (FR-044)', () => {
  it('needs at least 2 characters', async () => {
    expect(await searchForCustomer({ q: ' n ', dishFilter: 'all', now: NOON, locale: 'en' })).toBeNull();
  });

  it('matches either language, whatever the interface language, active kitchens only', async () => {
    await seed();
    const kn = await searchForCustomer({ q: 'ನೀರ್', dishFilter: 'all', now: NOON, locale: 'en' });
    const en = await searchForCustomer({ q: 'NEER', dishFilter: 'all', now: NOON, locale: 'kn' });
    const dishKeys = (r: typeof kn) => r!.dishes.map((d) => `${d.kitchen.name.en}/${d.dish.name.en}`).sort();
    expect(dishKeys(kn)).toEqual(['Fish Home/Neer dose', 'Veg Restaurant/Neer dose']);
    expect(dishKeys(en)).toEqual(dishKeys(kn));
    expect(dishKeys(en).some((k) => k.startsWith('Pending'))).toBe(false);
  });

  it('matches kitchen names and applies the dish filter', async () => {
    await seed();
    const kitchens = await searchForCustomer({ q: 'fish', dishFilter: 'all', now: NOON, locale: 'en' });
    expect(names(kitchens!.kitchens)).toEqual(['Fish Home']);
    const vegOnly = await searchForCustomer({ q: 'neer', dishFilter: 'veg', now: NOON, locale: 'en' });
    expect(vegOnly!.dishes.every((d) => d.dish.isVeg)).toBe(true);
    const nonVegOnly = await searchForCustomer({ q: 'neer', dishFilter: 'nonveg', now: NOON, locale: 'en' });
    expect(nonVegOnly!.dishes).toEqual([]);
    expect(names((await searchForCustomer({ q: 'fish', dishFilter: 'veg', now: NOON, locale: 'en' }))!.kitchens)).toEqual([]);
  });

  it('includes unavailable dishes, flagged', async () => {
    await seed();
    const result = await searchForCustomer({ q: 'neer', dishFilter: 'all', now: NOON, locale: 'en' });
    expect(result!.dishes.find((d) => d.kitchen.name.en === 'Fish Home')?.dish.available).toBe(false);
  });
});
