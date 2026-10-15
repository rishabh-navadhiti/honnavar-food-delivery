/**
 * STAND-IN: answers from a fixed list of Honnavar places and never calls the network. Used by
 * integration and end-to-end tests (GEOCODING_PROVIDER=stand-in) and for offline work.
 *
 * Declared in spec 002 and docs/fidelity-matrix.md ("Map search and reverse geocoding").
 * Deterministic and never fails.
 */
import type { Geocoder, Locale } from './types';

type StandInPlace = { en: string; kn: string; lat: number; lng: number };

const PLACES: StandInPlace[] = [
  { en: 'KSRTC bus stand, Honnavar', kn: 'ಕೆಎಸ್‌ಆರ್‌ಟಿಸಿ ಬಸ್ ನಿಲ್ದಾಣ, ಹೊನ್ನಾವರ', lat: 14.2795, lng: 74.4438 },
  { en: 'Market Road, Honnavar', kn: 'ಮಾರ್ಕೆಟ್ ರಸ್ತೆ, ಹೊನ್ನಾವರ', lat: 14.2815, lng: 74.4435 },
  { en: 'Sharavathi bridge, Honnavar', kn: 'ಶರಾವತಿ ಸೇತುವೆ, ಹೊನ್ನಾವರ', lat: 14.2915, lng: 74.4505 },
  { en: 'Kasarkod beach, Honnavar', kn: 'ಕಾಸರಕೋಡ ಬೀಚ್, ಹೊನ್ನಾವರ', lat: 14.2613, lng: 74.4322 },
  { en: 'Prabhatnagar, Honnavar', kn: 'ಪ್ರಭಾತನಗರ, ಹೊನ್ನಾವರ', lat: 14.284, lng: 74.45 },
  { en: 'Honnavar port', kn: 'ಹೊನ್ನಾವರ ಬಂದರು', lat: 14.2852, lng: 74.4392 },
  { en: 'Taluk office, Honnavar', kn: 'ತಾಲೂಕು ಕಚೇರಿ, ಹೊನ್ನಾವರ', lat: 14.281, lng: 74.446 },
  { en: 'Government hospital, Honnavar', kn: 'ಸರ್ಕಾರಿ ಆಸ್ಪತ್ರೆ, ಹೊನ್ನಾವರ', lat: 14.2825, lng: 74.447 },
  { en: 'Gandhada Oni, Honnavar', kn: 'ಗಂಧದ ಓಣಿ, ಹೊನ್ನಾವರ', lat: 14.279, lng: 74.4425 },
  { en: 'Karki, Honnavar', kn: 'ಕರ್ಕಿ, ಹೊನ್ನಾವರ', lat: 14.315, lng: 74.4269 },
];

const label = (place: StandInPlace, locale: Locale) => (locale === 'kn' ? place.kn : place.en);

export const standInGeocoder: Geocoder = {
  async search(query, { locale }) {
    const q = query.normalize('NFC').trim().toLowerCase();
    const hits = PLACES.filter((p) => p.en.toLowerCase().includes(q) || p.kn.includes(q)).slice(0, 5);
    return { ok: true, data: hits.map((p) => ({ label: label(p, locale), lat: p.lat, lng: p.lng })) };
  },

  async reverse(point, { locale }) {
    const closest = [...PLACES].sort(
      (a, b) => Math.hypot(a.lat - point.lat, a.lng - point.lng) - Math.hypot(b.lat - point.lat, b.lng - point.lng),
    )[0]!;
    return { ok: true, data: locale === 'kn' ? `${closest.kn} ಹತ್ತಿರ` : `Near ${closest.en}` };
  },
};
