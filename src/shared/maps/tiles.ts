import 'server-only';
import { env } from '../env';
import type { MapTiles } from './config';

/** Tile settings for client map components, from validated env (never NEXT_PUBLIC_). */
export function mapTiles(): MapTiles {
  return { url: env.MAP_TILE_URL, attribution: env.MAP_TILE_ATTRIBUTION };
}
