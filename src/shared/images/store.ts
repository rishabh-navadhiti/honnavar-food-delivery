import 'server-only';
import { createHash } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import sharp from 'sharp';
import { db, type Executor } from '../db/client';
import { images } from '../db/schema';
import { err, ok, type Result } from '../result';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);
const WIDTHS = { small: 320, large: 800 } as const;

async function variant(input: Buffer, width: number): Promise<Buffer> {
  return sharp(input).rotate().resize({ width }).webp({ quality: 70 }).toBuffer();
}

/**
 * Resize an uploaded (or seed) photo into two WebP variants and store it (research R7).
 * Identical bytes reuse the existing row.
 */
export async function storeImage(input: Buffer, executor: Executor = db): Promise<Result<{ id: string }>> {
  if (input.byteLength === 0 || input.byteLength > MAX_IMAGE_BYTES) return err('invalid_image');
  let format: string | undefined;
  try {
    format = (await sharp(input).metadata()).format;
  } catch {
    return err('invalid_image');
  }
  if (!format || !ACCEPTED_FORMATS.has(format)) return err('invalid_image');

  const sha256 = createHash('sha256').update(input).digest('hex');
  const [existing] = await executor.select({ id: images.id }).from(images).where(eq(images.sha256, sha256));
  if (existing) return ok({ id: existing.id });

  const [small, large] = await Promise.all([variant(input, WIDTHS.small), variant(input, WIDTHS.large)]);
  await executor.insert(images).values({ sha256, small, large }).onConflictDoNothing({ target: images.sha256 });
  const [row] = await executor.select({ id: images.id }).from(images).where(eq(images.sha256, sha256));
  return row ? ok({ id: row.id }) : err('unexpected');
}

/** Delete an image row when no kitchen or dish references it any more. */
export async function deleteImageIfUnused(imageId: string, executor: Executor = db): Promise<void> {
  await executor.execute(sql`
    delete from images
    where id = ${imageId}
      and not exists (select 1 from kitchens where photo_image_id = ${imageId})
      and not exists (select 1 from dishes where photo_image_id = ${imageId})
  `);
}

export async function readImageVariant(imageId: string, size: 'small' | 'large'): Promise<Buffer | null> {
  const [row] = await db
    .select({ bytes: size === 'small' ? images.small : images.large })
    .from(images)
    .where(eq(images.id, imageId));
  return row?.bytes ?? null;
}
