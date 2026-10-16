import type { LocalizedPair } from '@/shared/i18n/localized';
import type { KitchenSummary, SearchResults } from './queries';

/** Search suggestions while typing (FR-012, data-model.md "Suggestions"): a capped view of the existing search. */
export type Suggestions = {
  kitchens: { id: string; name: LocalizedPair; type: KitchenSummary['type']; photoImageId: string | null; state: KitchenSummary['state'] }[];
  dishes: {
    id: string;
    name: LocalizedPair;
    isVeg: boolean;
    priceRupees: number;
    photoImageId: string | null;
    kitchen: { id: string; name: LocalizedPair };
  }[];
  total: { kitchens: number; dishes: number };
};

export const MAX_KITCHEN_SUGGESTIONS = 4;
export const MAX_DISH_SUGGESTIONS = 6;

export function toSuggestions(results: SearchResults | null): Suggestions {
  if (!results) return { kitchens: [], dishes: [], total: { kitchens: 0, dishes: 0 } };
  return {
    kitchens: results.kitchens.slice(0, MAX_KITCHEN_SUGGESTIONS).map((k) => ({
      id: k.id,
      name: k.name,
      type: k.type,
      photoImageId: k.photoImageId,
      state: k.state,
    })),
    dishes: results.dishes.slice(0, MAX_DISH_SUGGESTIONS).map(({ dish, kitchen }) => ({
      id: dish.id,
      name: dish.name,
      isVeg: dish.isVeg,
      priceRupees: dish.priceRupees,
      photoImageId: dish.photoImageId,
      kitchen,
    })),
    total: { kitchens: results.kitchens.length, dishes: results.dishes.length },
  };
}
