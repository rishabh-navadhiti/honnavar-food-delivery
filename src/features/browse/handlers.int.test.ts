import { beforeEach, describe, expect, it } from 'vitest';
import { makeCategory, makeDish, makeKitchen, truncateAll } from '@/shared/db/test/helpers';
import { handleSuggestions } from './handlers';
import { searchForCustomer } from './queries';
import { toSuggestions } from './suggestions';

beforeEach(truncateAll);

const NOON = new Date('2026-10-12T12:00:00+05:30');
const url = (q?: string) => new URL(`http://localhost/api/search/suggestions${q === undefined ? '' : `?q=${encodeURIComponent(q)}`}`);
const empty = { kitchens: [], dishes: [], total: { kitchens: 0, dishes: 0 } };

async function seed() {
  for (let i = 0; i < 6; i += 1) {
    const kitchen = await makeKitchen({ nameEn: `Neer Place ${i}`, nameKn: `ನೀರ್ ಮನೆ ${i}`, type: 'home_kitchen' });
    const category = await makeCategory(kitchen.id);
    await makeDish(kitchen.id, category.id, { nameEn: `Neer dose ${i}`, nameKn: `ನೀರ್ ದೋಸೆ ${i}`, isVeg: true });
    await makeDish(kitchen.id, category.id, { nameEn: `Neer fish ${i}`, isVeg: false });
  }
}

async function json(response: Response) {
  return (await response.json()) as unknown;
}

describe('GET /api/search/suggestions (contracts/routes.md)', () => {
  it('returns the existing search results, capped, without caching', async () => {
    await seed();
    const response = await handleSuggestions(url('neer'), { dishFilter: 'all', locale: 'en', now: NOON });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const expected = toSuggestions(await searchForCustomer({ q: 'neer', dishFilter: 'all', now: NOON, locale: 'en' }));
    expect(await json(response)).toEqual(JSON.parse(JSON.stringify(expected)));
    expect(expected.kitchens).toHaveLength(4);
    expect(expected.dishes).toHaveLength(6);
    expect(expected.total).toEqual({ kitchens: 6, dishes: 12 });
  });

  it('matches Kannada names too', async () => {
    await seed();
    const body = (await json(await handleSuggestions(url('ನೀರ್'), { dishFilter: 'all', locale: 'kn', now: NOON }))) as typeof empty;
    expect(body.total.kitchens).toBe(6);
  });

  it('honours the dish filter', async () => {
    await seed();
    const body = (await json(await handleSuggestions(url('neer'), { dishFilter: 'nonveg', locale: 'en', now: NOON }))) as {
      dishes: { isVeg: boolean }[];
    };
    expect(body.dishes.length).toBeGreaterThan(0);
    expect(body.dishes.every((d) => !d.isVeg)).toBe(true);
  });

  it('returns empty lists for a missing, too short or too long query', async () => {
    await seed();
    for (const q of [undefined, '', 'n', ' n ', 'x'.repeat(81)]) {
      const response = await handleSuggestions(url(q), { dishFilter: 'all', locale: 'en', now: NOON });
      expect(response.status).toBe(200);
      expect(await json(response)).toEqual(empty);
    }
  });
});
