import type { GeoResult, Geocoder, LatLng, Locale, Place } from './types';

/**
 * OpenStreetMap Nominatim, real (research R7). Called from the server only, within the public
 * service's usage policy (operations.osmfoundation.org/policies/nominatim):
 * - an identifying User-Agent;
 * - at most one request per second for the whole process, through an internal queue; more than
 *   5 waiting requests are refused as `busy` instead of queued;
 * - results cached (LRU, 500 entries);
 * - no search-as-you-type: callers search on submit only.
 * Requests time out after 4 s as `unavailable`. More traffic or several server processes need a
 * self-hosted Nominatim or a paid provider: a change to this adapter only.
 */

/** Bias results to Honnavar: left,top,right,bottom in longitude/latitude. */
export const HONNAVAR_VIEWBOX = '74.36,14.36,74.53,14.2';

const MIN_INTERVAL_MS = 1000;
const MAX_WAITING = 5;
const TIMEOUT_MS = 4000;
const CACHE_SIZE = 500;

export const cacheKey = {
  search: (query: string, locale: Locale) => `s:${locale}:${query.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase()}`,
  reverse: (point: LatLng, locale: Locale) => `r:${locale}:${point.lat.toFixed(4)},${point.lng.toFixed(4)}`,
};

/** "KSRTC Bus Stand, Honnavar, Karnataka, 581334, India" → its first three parts. */
function shortLabel(displayName: string): string {
  return displayName
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(', ')
    .slice(0, 300);
}

class Lru<V> {
  private readonly map = new Map<string, V>();
  constructor(private readonly size: number) {}
  get(key: string): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }
  set(key: string, value: V): void {
    this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.size) this.map.delete(this.map.keys().next().value!);
  }
}

type Options = { baseUrl: string; userAgent: string; fetch?: typeof fetch };

export function createNominatimGeocoder(options: Options): Geocoder {
  const fetchImpl = options.fetch ?? fetch;
  const cache = new Lru<unknown>(CACHE_SIZE);
  let tail: Promise<unknown> = Promise.resolve();
  let lastSentAt = Number.NEGATIVE_INFINITY;
  /** Requests accepted and not yet finished: one in flight plus those waiting. */
  let pending = 0;

  async function get(path: string, params: Record<string, string>): Promise<GeoResult<unknown>> {
    if (pending > MAX_WAITING) return { ok: false, error: 'busy' };
    pending += 1;
    const run = tail.then(async (): Promise<GeoResult<unknown>> => {
      const wait = lastSentAt + MIN_INTERVAL_MS - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      lastSentAt = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const url = `${options.baseUrl.replace(/\/$/, '')}/${path}?${new URLSearchParams(params)}`;
        const response = await fetchImpl(url, {
          headers: { 'User-Agent': options.userAgent, Accept: 'application/json' },
          signal: controller.signal,
        });
        if (!response.ok) return { ok: false, error: 'unavailable' };
        return { ok: true, data: await response.json() };
      } catch {
        return { ok: false, error: 'unavailable' };
      } finally {
        clearTimeout(timer);
      }
    });
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    try {
      return await run;
    } finally {
      pending -= 1;
    }
  }

  return {
    async search(query, { locale }) {
      const key = cacheKey.search(query, locale);
      const cached = cache.get(key) as Place[] | undefined;
      if (cached) return { ok: true, data: cached };
      const result = await get('search', {
        format: 'jsonv2',
        q: query.trim(),
        countrycodes: 'in',
        viewbox: HONNAVAR_VIEWBOX,
        bounded: '0',
        limit: '5',
        'accept-language': locale,
      });
      if (!result.ok) return result;
      const rows = Array.isArray(result.data) ? (result.data as { display_name?: string; lat?: string; lon?: string }[]) : [];
      const places = rows
        .filter((r) => r.display_name && r.lat && r.lon)
        .map((r) => ({ label: shortLabel(r.display_name!), lat: Number(r.lat), lng: Number(r.lon) }));
      cache.set(key, places);
      return { ok: true, data: places };
    },

    async reverse(point, { locale }) {
      const key = cacheKey.reverse(point, locale);
      const cached = cache.get(key) as string | null | undefined;
      if (cached !== undefined) return { ok: true, data: cached };
      const result = await get('reverse', {
        format: 'jsonv2',
        lat: String(point.lat),
        lon: String(point.lng),
        zoom: '18',
        'accept-language': locale,
      });
      if (!result.ok) return result;
      const name = (result.data as { display_name?: string } | null)?.display_name;
      const label = name ? shortLabel(name) : null;
      cache.set(key, label);
      return { ok: true, data: label };
    },
  };
}
