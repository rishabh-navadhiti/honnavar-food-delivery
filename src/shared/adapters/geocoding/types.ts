export type Locale = 'en' | 'kn';
export type LatLng = { lat: number; lng: number };
export type Place = { label: string; lat: number; lng: number };
export type GeoError = 'unavailable' | 'busy';
export type GeoResult<T> = { ok: true; data: T } | { ok: false; error: GeoError };

/** Map search and the address under the pin (Principle III: one adapter, stable interface). */
export interface Geocoder {
  search(query: string, opts: { locale: Locale }): Promise<GeoResult<Place[]>>;
  reverse(point: LatLng, opts: { locale: Locale }): Promise<GeoResult<string | null>>;
}
