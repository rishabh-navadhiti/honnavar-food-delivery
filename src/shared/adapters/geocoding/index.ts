import 'server-only';
import { version } from '../../../../package.json';
import { env } from '../../env';
import { createNominatimGeocoder } from './nominatim';
import { standInGeocoder } from './stand-in';
import type { Geocoder } from './types';

export type { GeoError, GeoResult, Geocoder, LatLng, Locale, Place } from './types';

/**
 * The geocoder in use (research R7): the real OpenStreetMap Nominatim service by default, or the
 * declared STAND-IN when GEOCODING_PROVIDER=stand-in (tests, offline work).
 */
export const geocoder: Geocoder =
  env.GEOCODING_PROVIDER === 'stand-in'
    ? standInGeocoder
    : createNominatimGeocoder({
        baseUrl: env.NOMINATIM_BASE_URL,
        userAgent: `honnavar-food-delivery-poc/${version} (+${env.GEOCODING_CONTACT})`,
      });
