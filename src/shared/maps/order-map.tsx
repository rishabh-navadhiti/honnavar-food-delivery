'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import type { MapTiles } from './config';
import { HOME_SVG, KITCHEN_SVG } from './icons';

type Point = { lat: number; lng: number };

/**
 * The static order map (FR-026): a kitchen marker and a delivery marker, framed to fit. Nothing
 * moves and nothing is tracked; dragging, zoom and keyboard are off. Leaflet loads in the browser.
 */
export function OrderMap({
  tiles,
  kitchen,
  delivery,
  labels,
}: {
  tiles: MapTiles;
  kitchen: Point | null;
  delivery: Point;
  labels: { map: string; kitchen: string; delivery: string };
}) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: import('leaflet').Map | null = null;
    let cancelled = false;
    void import('leaflet').then((L) => {
      if (cancelled || !container.current) return;
      map = L.map(container.current, {
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        zoomControl: false,
      });
      L.tileLayer(tiles.url, { attribution: tiles.attribution, maxZoom: 19 }).addTo(map);
      const icon = (svg: string, label: string) =>
        L.divIcon({ html: `<span role="img" aria-label="${label.replace(/"/g, '&quot;')}">${svg}</span>`, className: '', iconSize: [40, 52], iconAnchor: [20, 48] });
      const points: [number, number][] = [[delivery.lat, delivery.lng]];
      L.marker([delivery.lat, delivery.lng], { icon: icon(HOME_SVG, labels.delivery), keyboard: false }).addTo(map);
      if (kitchen) {
        L.marker([kitchen.lat, kitchen.lng], { icon: icon(KITCHEN_SVG, labels.kitchen), keyboard: false }).addTo(map);
        points.push([kitchen.lat, kitchen.lng]);
      }
      if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 17 });
      else map.setView(points[0]!, 16);
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
    // Coordinates, not objects: the page refreshes every 10 s and must not rebuild the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles.url, tiles.attribution, kitchen?.lat, kitchen?.lng, delivery.lat, delivery.lng, labels.kitchen, labels.delivery]);
  return <div ref={container} role="region" aria-label={labels.map} className="h-56 w-full overflow-hidden rounded-2xl border border-line" data-testid="order-map" />;
}
