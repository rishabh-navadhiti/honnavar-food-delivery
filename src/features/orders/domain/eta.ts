/** Expected delivery time, a declared stand-in (FR-057 to FR-059; research R13). */

const MINUTE = 60_000;
/** The kitchen page shows "{from}–{to} min", where `to` is this many minutes after `from`. */
export const ETA_RANGE_SPREAD_MINUTES = 10;

/** Set once when the order is placed and never recalculated. */
export function expectedAt(placedAt: Date, prepMinutes: number, deliveryMinutes: number): Date {
  return new Date(placedAt.getTime() + (prepMinutes + deliveryMinutes) * MINUTE);
}

export function etaRange(prepMinutes: number, deliveryMinutes: number): { from: number; to: number } {
  const from = prepMinutes + deliveryMinutes;
  return { from, to: from + ETA_RANGE_SPREAD_MINUTES };
}
