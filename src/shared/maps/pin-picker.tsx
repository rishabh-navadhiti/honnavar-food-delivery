'use client';

import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap } from 'leaflet';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { buttonClasses } from '../ui/button';
import { HONNAVAR_CENTRE, sameSpot, type MapTiles } from './config';
import { PIN_SVG } from './icons';

export type PickedLocation = { lat: number; lng: number; geocodedText: string | null };
type Place = { label: string; lat: number; lng: number };
type Lookup = { state: 'idle' | 'loading' } | { state: 'found'; text: string | null } | { state: 'failed' };

const LOOKUP_DELAY_MS = 1000;

/**
 * The add-address map step (FR-053) and the admin kitchen location (FR-037). The map moves under a
 * fixed centre pin. Search runs on submit only and the address under the pin is looked up 1 s after
 * the pin settles, as Nominatim's usage policy requires (research R7).
 */
export function PinPicker({
  tiles,
  initial,
  onChange,
  onContinue,
  continueLabel,
}: {
  tiles: MapTiles;
  initial?: { lat: number; lng: number } | null;
  onChange?: (location: PickedLocation) => void;
  onContinue?: (location: PickedLocation) => void;
  continueLabel?: string;
}) {
  const t = useTranslations('pinPicker');
  const locale = useLocale();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const [point, setPoint] = useState<{ lat: number; lng: number }>(initial ?? HONNAVAR_CENTRE);
  const [lookup, setLookup] = useState<Lookup>({ state: 'idle' });
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const lastLookedUp = useRef<{ lat: number; lng: number } | null>(null);

  const moveTo = useCallback((lat: number, lng: number) => {
    map.current?.setView([lat, lng], Math.max(map.current.getZoom(), 17));
  }, []);

  const goToCurrentLocation = useCallback(
    (quiet: boolean) => {
      if (!('geolocation' in navigator)) {
        if (!quiet) setLocationMessage(t('locationUnavailable'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationMessage(null);
          moveTo(position.coords.latitude, position.coords.longitude);
        },
        () => {
          if (!quiet) setLocationMessage(t('locationRefused'));
        },
        { enableHighAccuracy: true, timeout: 10_000 },
      );
    },
    [moveTo, t],
  );

  // Create the map once, in the browser only.
  useEffect(() => {
    let cancelled = false;
    void import('leaflet').then((L) => {
      if (cancelled || !container.current || map.current) return;
      const start = initial ?? HONNAVAR_CENTRE;
      const instance = L.map(container.current, { zoomControl: true, attributionControl: true }).setView([start.lat, start.lng], 17);
      L.tileLayer(tiles.url, { attribution: tiles.attribution, maxZoom: 19 }).addTo(instance);
      instance.on('moveend', () => {
        const centre = instance.getCenter();
        setPoint({ lat: Number(centre.lat.toFixed(6)), lng: Number(centre.lng.toFixed(6)) });
      });
      map.current = instance;
      // Start at the phone's location when the customer has already allowed it (FR-053).
      if (!initial && navigator.permissions) {
        navigator.permissions
          .query({ name: 'geolocation' })
          .then((status) => {
            if (status.state === 'granted') goToCurrentLocation(true);
          })
          .catch(() => {});
      }
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // The map is created once; later prop changes do not recreate it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Look up the address under the pin once it has settled and moved more than ~11 m.
  useEffect(() => {
    if (lastLookedUp.current && sameSpot(lastLookedUp.current, point)) return;
    const timer = setTimeout(() => {
      lastLookedUp.current = point;
      setLookup({ state: 'loading' });
      const params = new URLSearchParams({ lat: String(point.lat), lng: String(point.lng), locale });
      fetch(`/api/geo/reverse?${params}`)
        .then(async (response) => {
          if (!response.ok) throw new Error(String(response.status));
          const body = (await response.json()) as { label: string | null };
          setLookup({ state: 'found', text: body.label });
        })
        .catch(() => setLookup({ state: 'failed' }));
    }, LOOKUP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [point, locale]);

  const current: PickedLocation = { ...point, geocodedText: lookup.state === 'found' ? lookup.text : null };
  useEffect(() => {
    onChange?.(current);
    // Report each settled location and lookup result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point, lookup]);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (query.trim().length < 3 || searching) return;
    setSearching(true);
    setSearchFailed(false);
    try {
      const params = new URLSearchParams({ q: query.trim(), locale });
      const response = await fetch(`/api/geo/search?${params}`);
      if (!response.ok) throw new Error(String(response.status));
      setPlaces(((await response.json()) as { places: Place[] }).places);
    } catch {
      setSearchFailed(true);
      setPlaces(null);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={search} role="search" className="flex gap-2">
        <label htmlFor="pin-search" className="sr-only">
          {t('searchLabel')}
        </label>
        <input
          id="pin-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          minLength={3}
          maxLength={100}
          className="min-h-touch w-full rounded-xl border border-line bg-surface px-3 text-base"
        />
        <button type="submit" disabled={searching || query.trim().length < 3} className={buttonClasses('secondary', 'shrink-0')}>
          {searching ? t('searching') : t('search')}
        </button>
      </form>
      {searchFailed ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {t('searchFailed')}
        </p>
      ) : null}
      {places ? (
        places.length === 0 ? (
          <p className="text-sm text-muted">{t('noPlaces')}</p>
        ) : (
          <ul className="flex flex-col gap-1" aria-label={t('results')}>
            {places.map((place) => (
              <li key={`${place.lat},${place.lng}`}>
                <button
                  type="button"
                  onClick={() => {
                    setPlaces(null);
                    moveTo(place.lat, place.lng);
                  }}
                  className="min-h-touch w-full rounded-xl border border-line bg-surface px-3 py-2 text-left text-base"
                >
                  {place.label}
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}

      <button type="button" onClick={() => goToCurrentLocation(false)} className={buttonClasses('secondary')}>
        {t('useCurrentLocation')}
      </button>
      {locationMessage ? (
        <p role="status" className="text-sm font-medium text-warn">
          {locationMessage}
        </p>
      ) : null}

      <div className="relative">
        <div ref={container} className="h-72 w-full overflow-hidden rounded-2xl border border-line" role="application" aria-label={t('mapLabel')} />
        {/* The fixed pin: the map moves under it. */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-full"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: PIN_SVG }}
        />
      </div>

      <div className="rounded-xl bg-secondary p-3" aria-live="polite" data-testid="pin-address">
        <p className="text-sm font-semibold text-muted">{t('addressHere')}</p>
        <p className="text-base">
          {lookup.state === 'found' ? (lookup.text ?? t('noAddress')) : lookup.state === 'failed' ? t('lookupFailed') : t('lookingUp')}
        </p>
      </div>

      {onContinue ? (
        <button type="button" onClick={() => onContinue(current)} className={buttonClasses('primary')}>
          {continueLabel ?? t('continue')}
        </button>
      ) : null}
    </div>
  );
}
