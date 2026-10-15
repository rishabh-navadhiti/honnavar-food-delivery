/**
 * "Open in maps" (FR-041, research R8): a Google Maps link handed to the phone, which opens the
 * Google Maps app on Android and the browser elsewhere. No key or SDK; not an integration.
 */
export function openInMapsUrl({ location, text }: { location: { lat: number; lng: number } | null; text: string }): string {
  if (location) return `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
}
