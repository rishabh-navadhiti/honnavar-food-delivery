import { describe, expect, it } from 'vitest';
import type { DishSearchHit, KitchenSummary, SearchResults } from './queries';
import { toSuggestions } from './suggestions';

const kitchen = (i: number): KitchenSummary => ({
  id: `k-${i}`,
  name: { en: `Kitchen ${i}`, kn: null },
  type: 'restaurant',
  pureVeg: false,
  photoImageId: i % 2 ? `img-${i}` : null,
  landmark: `Landmark ${i}`,
  prepMinutes: 25,
  state: { kind: 'open', closesAt: '22:00' } as unknown as KitchenSummary['state'],
});

const dish = (i: number): DishSearchHit => ({
  kitchen: { id: `k-${i}`, name: { en: `Kitchen ${i}`, kn: `ಅಡುಗೆಮನೆ ${i}` } },
  dish: {
    id: `d-${i}`,
    name: { en: `Dish ${i}`, kn: null },
    description: { en: null, kn: null },
    priceRupees: 100 + i,
    isVeg: i % 2 === 0,
    available: true,
    photoImageId: null,
  },
});

const results = (k: number, d: number): SearchResults => ({
  q: 'di',
  kitchens: Array.from({ length: k }, (_, i) => kitchen(i)),
  dishes: Array.from({ length: d }, (_, i) => dish(i)),
});

describe('toSuggestions (data-model.md "Suggestions")', () => {
  it('keeps at most 4 kitchens and 6 dishes, in the order given', () => {
    const s = toSuggestions(results(7, 9));
    expect(s.kitchens.map((k) => k.id)).toEqual(['k-0', 'k-1', 'k-2', 'k-3']);
    expect(s.dishes.map((d) => d.id)).toEqual(['d-0', 'd-1', 'd-2', 'd-3', 'd-4', 'd-5']);
  });

  it('reports the full counts', () => {
    expect(toSuggestions(results(7, 9)).total).toEqual({ kitchens: 7, dishes: 9 });
    expect(toSuggestions(results(1, 2)).total).toEqual({ kitchens: 1, dishes: 2 });
  });

  it('carries only the fields the suggestion list shows', () => {
    const s = toSuggestions(results(2, 1));
    expect(s.kitchens[1]).toEqual({ id: 'k-1', name: { en: 'Kitchen 1', kn: null }, type: 'restaurant', photoImageId: 'img-1', state: kitchen(1).state });
    expect(s.dishes[0]).toEqual({
      id: 'd-0',
      name: { en: 'Dish 0', kn: null },
      isVeg: true,
      priceRupees: 100,
      photoImageId: null,
      kitchen: { id: 'k-0', name: { en: 'Kitchen 0', kn: 'ಅಡುಗೆಮನೆ 0' } },
    });
  });

  it('gives empty lists for no results', () => {
    expect(toSuggestions(null)).toEqual({ kitchens: [], dishes: [], total: { kitchens: 0, dishes: 0 } });
    expect(toSuggestions(results(0, 0))).toEqual({ kitchens: [], dishes: [], total: { kitchens: 0, dishes: 0 } });
  });
});
