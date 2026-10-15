import { describe, expect, it } from 'vitest';
import { standInGeocoder } from './stand-in';

describe('STAND-IN geocoder', () => {
  it('finds places by part of their name in either language, at most 5', async () => {
    const en = await standInGeocoder.search('bus', { locale: 'en' });
    expect(en.ok && en.data[0]?.label).toContain('bus stand');
    const kn = await standInGeocoder.search('ಬಸ್', { locale: 'kn' });
    expect(kn.ok && kn.data[0]?.label).toContain('ಬಸ್');
    const all = await standInGeocoder.search('a', { locale: 'en' });
    expect(all.ok && all.data.length).toBeLessThanOrEqual(5);
  });

  it('describes a pin by its closest place, in the requested language', async () => {
    expect(await standInGeocoder.reverse({ lat: 14.2796, lng: 74.4439 }, { locale: 'en' })).toEqual({
      ok: true,
      data: 'Near KSRTC bus stand, Honnavar',
    });
    const kn = await standInGeocoder.reverse({ lat: 14.2796, lng: 74.4439 }, { locale: 'kn' });
    expect(kn.ok && kn.data).toContain('ಹತ್ತಿರ');
  });

  it('never fails', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => standInGeocoder.search('zzz', { locale: 'en' })));
    expect(results.every((r) => r.ok)).toBe(true);
  });
});
