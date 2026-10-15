import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cacheKey, createNominatimGeocoder, HONNAVAR_VIEWBOX } from './nominatim';

beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-15T12:00:00Z') }));
afterEach(() => vi.useRealTimers());

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

function setup(fetchImpl: (url: string, init: RequestInit) => Promise<Response>) {
  const calls: { url: URL; init: RequestInit; at: number }[] = [];
  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url: new URL(url), init, at: Date.now() });
    return fetchImpl(url, init);
  });
  const geocoder = createNominatimGeocoder({
    baseUrl: 'https://nominatim.example.org',
    userAgent: 'honnavar-food-delivery-poc/0.1.0 (+https://example.org/contact)',
    fetch: fetchMock as unknown as typeof fetch,
  });
  return { geocoder, calls, fetchMock };
}

describe('Nominatim geocoder (research R7)', () => {
  it('searches with the policy-required parameters and an identifying User-Agent', async () => {
    const { geocoder, calls } = setup(async () => json([{ display_name: 'KSRTC Bus Stand, Honnavar, Karnataka, 581334, India', lat: '14.2795', lon: '74.4438' }]));
    const result = await geocoder.search('bus stand', { locale: 'kn' });
    expect(result).toEqual({ ok: true, data: [{ label: 'KSRTC Bus Stand, Honnavar, Karnataka', lat: 14.2795, lng: 74.4438 }] });
    const { url, init } = calls[0]!;
    expect(url.origin + url.pathname).toBe('https://nominatim.example.org/search');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      format: 'jsonv2',
      q: 'bus stand',
      countrycodes: 'in',
      viewbox: HONNAVAR_VIEWBOX,
      bounded: '0',
      limit: '5',
      'accept-language': 'kn',
    });
    expect(new Headers(init.headers).get('User-Agent')).toBe('honnavar-food-delivery-poc/0.1.0 (+https://example.org/contact)');
  });

  it('looks up the address under a pin at street level', async () => {
    const { geocoder, calls } = setup(async () => json({ display_name: 'Prabhatnagar, Honnavar, Uttara Kannada, Karnataka, 581334, India' }));
    expect(await geocoder.reverse({ lat: 14.28451, lng: 74.45102 }, { locale: 'en' })).toEqual({
      ok: true,
      data: 'Prabhatnagar, Honnavar, Uttara Kannada',
    });
    expect(Object.fromEntries(calls[0]!.url.searchParams)).toEqual({
      format: 'jsonv2',
      lat: '14.28451',
      lon: '74.45102',
      zoom: '18',
      'accept-language': 'en',
    });
  });

  it('returns null when there is no address under the pin', async () => {
    const { geocoder } = setup(async () => json({ error: 'Unable to geocode' }));
    expect(await geocoder.reverse({ lat: 14.2, lng: 74.3 }, { locale: 'en' })).toEqual({ ok: true, data: null });
  });

  it('keeps requests at least one second apart', async () => {
    const { geocoder, calls } = setup(async () => json([]));
    const searches = [geocoder.search('aaa', { locale: 'en' }), geocoder.search('bbb', { locale: 'en' }), geocoder.search('ccc', { locale: 'en' })];
    await vi.advanceTimersByTimeAsync(3000);
    await Promise.all(searches);
    expect(calls).toHaveLength(3);
    expect(calls[1]!.at - calls[0]!.at).toBeGreaterThanOrEqual(1000);
    expect(calls[2]!.at - calls[1]!.at).toBeGreaterThanOrEqual(1000);
  });

  it('answers busy instead of queueing more than 5 waiting requests', async () => {
    const { geocoder } = setup(async () => json([]));
    const results = Array.from({ length: 7 }, (_, i) => geocoder.search(`query ${i}`, { locale: 'en' }));
    await vi.advanceTimersByTimeAsync(10_000);
    const settled = await Promise.all(results);
    // One runs straight away and five wait; the seventh is refused.
    expect(settled.filter((r) => !r.ok && r.error === 'busy')).toHaveLength(1);
    expect(settled.filter((r) => r.ok)).toHaveLength(6);
  });

  it('gives up after 4 seconds as unavailable, and on server errors', async () => {
    const hanging = setup(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const pending = hanging.geocoder.search('slow', { locale: 'en' });
    await vi.advanceTimersByTimeAsync(4000);
    expect(await pending).toEqual({ ok: false, error: 'unavailable' });

    const failing = setup(async () => new Response('oops', { status: 503 }));
    expect(await failing.geocoder.search('down', { locale: 'en' })).toEqual({ ok: false, error: 'unavailable' });
  });

  it('caches by rounded coordinates or normalised query, per language', async () => {
    const { geocoder, fetchMock } = setup(async () => json({ display_name: 'Somewhere, Honnavar' }));
    await geocoder.reverse({ lat: 14.28451, lng: 74.45102 }, { locale: 'en' });
    await geocoder.reverse({ lat: 14.28449, lng: 74.45098 }, { locale: 'en' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const kn = geocoder.reverse({ lat: 14.28451, lng: 74.45102 }, { locale: 'kn' });
    await vi.advanceTimersByTimeAsync(1000);
    await kn;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(cacheKey.reverse({ lat: 14.28451, lng: 74.45102 }, 'en')).toBe('r:en:14.2845,74.4510');
    expect(cacheKey.search('  Bus   Stand ', 'en')).toBe('s:en:bus stand');
  });
});
