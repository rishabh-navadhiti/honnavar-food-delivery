import { describe, expect, it } from 'vitest';
import { filterMenu, kitchenMatchesDishFilter, parseDishFilter } from './dish-filter';

const veg = { isVeg: true, available: true };
const vegOff = { isVeg: true, available: false };
const nonVeg = { isVeg: false, available: true };
const nonVegOff = { isVeg: false, available: false };

describe('kitchenMatchesDishFilter (FR-043)', () => {
  it('"all" always matches, even with no available dishes', () => {
    expect(kitchenMatchesDishFilter([], 'all')).toBe(true);
    expect(kitchenMatchesDishFilter([vegOff], 'all')).toBe(true);
  });

  it('"veg" needs at least one available veg dish', () => {
    expect(kitchenMatchesDishFilter([veg, nonVeg], 'veg')).toBe(true);
    expect(kitchenMatchesDishFilter([vegOff, nonVeg], 'veg')).toBe(false);
  });

  it('"nonveg" needs at least one available non-veg dish', () => {
    expect(kitchenMatchesDishFilter([veg, nonVeg], 'nonveg')).toBe(true);
    expect(kitchenMatchesDishFilter([veg, nonVegOff], 'nonveg')).toBe(false);
  });
});

describe('filterMenu', () => {
  const menu = [
    { id: 'a', dishes: [veg, nonVeg] },
    { id: 'b', dishes: [nonVeg, nonVegOff] },
    { id: 'c', dishes: [vegOff] },
  ];

  it('keeps only matching dishes, including unavailable ones, and drops empty categories', () => {
    expect(filterMenu(menu, 'veg')).toEqual([
      { id: 'a', dishes: [veg] },
      { id: 'c', dishes: [vegOff] },
    ]);
    expect(filterMenu(menu, 'nonveg')).toEqual([
      { id: 'a', dishes: [nonVeg] },
      { id: 'b', dishes: [nonVeg, nonVegOff] },
    ]);
  });

  it('"all" keeps everything except empty categories', () => {
    expect(filterMenu([...menu, { id: 'd', dishes: [] }], 'all')).toEqual(menu);
  });
});

describe('parseDishFilter', () => {
  it('accepts the three states and defaults to all', () => {
    expect(parseDishFilter('veg')).toBe('veg');
    expect(parseDishFilter('nonveg')).toBe('nonveg');
    expect(parseDishFilter('all')).toBe('all');
    expect(parseDishFilter('bogus')).toBe('all');
    expect(parseDishFilter(undefined)).toBe('all');
  });
});
