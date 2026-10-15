import { describe, expect, it } from 'vitest';
import { openInMapsUrl } from './open-in-maps';

describe('openInMapsUrl (FR-041, research R8)', () => {
  it('gives directions to a pinned location', () => {
    expect(openInMapsUrl({ location: { lat: 14.2845, lng: 74.451 }, text: 'ignored' })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=14.2845,74.451',
    );
  });

  it('searches the address text when there is no pin', () => {
    expect(openInMapsUrl({ location: null, text: 'Near KSRTC bus stand, NH-66, Honnavar' })).toBe(
      'https://www.google.com/maps/search/?api=1&query=Near%20KSRTC%20bus%20stand%2C%20NH-66%2C%20Honnavar',
    );
  });
});
