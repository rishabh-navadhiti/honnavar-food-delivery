/** Map settings passed from the server to client map components (research R8, R12). */
export type MapTiles = { url: string; attribution: string };

/** Honnavar town centre: the pin's starting point when the phone's location is not available. */
export const HONNAVAR_CENTRE = { lat: 14.2798, lng: 74.4439 } as const;

/** ~11 m: the precision of address lookups and their cache (research R7). */
export function sameSpot(a: { lat: number; lng: number }, b: { lat: number; lng: number }): boolean {
  return a.lat.toFixed(4) === b.lat.toFixed(4) && a.lng.toFixed(4) === b.lng.toFixed(4);
}
