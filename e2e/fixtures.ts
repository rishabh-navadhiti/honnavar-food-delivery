/**
 * Test-only data fixtures for the ordering e2e specs (research R15). They write straight to the
 * DATABASE_URL database after `resetDemoData()`, so no app code needs a clock override.
 */
import type { Page } from '@playwright/test';
import postgres from 'postgres';

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required for e2e fixtures.');
  return url;
}

/** Make a kitchen open around the clock (00:00–24:00 every day) and end any temporary closure. */
export async function openAllDay(kitchenId: string): Promise<void> {
  const sql = postgres(databaseUrl(), { max: 1, onnotice: () => {} });
  try {
    await sql.begin(async (tx) => {
      await tx`delete from kitchen_hours where kitchen_id = ${kitchenId}`;
      for (let weekday = 1; weekday <= 7; weekday += 1) {
        await tx`
          insert into kitchen_hours (kitchen_id, weekday, slot, opens_min, closes_min)
          values (${kitchenId}, ${weekday}, 1, 0, 1440)
        `;
      }
      await tx`update kitchens set closed_at = null, reopens_at = null where id = ${kitchenId}`;
    });
  } finally {
    await sql.end();
  }
}

/** Abort every map-tile request, so tests never depend on the tile server. */
export async function blockMapTiles(page: Page): Promise<void> {
  const template = process.env.MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const host = new URL(template.replace(/\{[a-z]\}/g, '0')).host;
  await page.route((url) => url.host === host, (route) => route.abort());
}
