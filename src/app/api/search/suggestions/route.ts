import { getLocale } from 'next-intl/server';
import { readDishFilter } from '@/features/browse/dish-filter-cookie';
import { handleSuggestions } from '@/features/browse/handlers';
import { isLocale } from '@/shared/i18n/config';

export async function GET(request: Request): Promise<Response> {
  const locale = await getLocale();
  return handleSuggestions(new URL(request.url), {
    dishFilter: await readDishFilter(),
    locale: isLocale(locale) ? locale : 'en',
    now: new Date(),
  });
}
