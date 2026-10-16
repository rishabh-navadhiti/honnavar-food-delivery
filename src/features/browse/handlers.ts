import 'server-only';
import { z } from 'zod';
import type { Locale } from '@/shared/i18n/config';
import { log } from '@/shared/log';
import type { DishFilter } from './domain/dish-filter';
import { searchForCustomer } from './queries';
import { toSuggestions } from './suggestions';

/** `q`: trimmed, 2–80 characters; anything else is no query (fails closed to empty lists). */
const querySchema = z.object({ q: z.string().normalize('NFC').trim().min(2).max(80) });

/**
 * GET /api/search/suggestions (FR-012, contracts/routes.md): the existing search, capped for the
 * list under the home search box. Public, like the home screen; never cached (open state changes).
 */
export async function handleSuggestions(url: URL, context: { dishFilter: DishFilter; locale: Locale; now: Date }): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store' };
  const parsed = querySchema.safeParse({ q: url.searchParams.get('q') ?? '' });
  if (!parsed.success || [...parsed.data.q].length < 2) return Response.json(toSuggestions(null), { headers });
  try {
    const results = await searchForCustomer({ q: parsed.data.q, dishFilter: context.dishFilter, now: context.now, locale: context.locale });
    return Response.json(toSuggestions(results), { headers });
  } catch (error) {
    log.error('search suggestions failed', { handler: 'search.suggestions', q: parsed.data.q, error });
    return Response.json({ error: 'unavailable' }, { status: 500, headers });
  }
}
