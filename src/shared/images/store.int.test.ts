import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/client';
import { dishes, images } from '../db/schema';
import { makeCategory, makeDish, makeKitchen, truncateAll } from '../db/test/helpers';
import { deleteImageIfUnused, MAX_IMAGE_BYTES, storeImage } from './store';
import { noiseJpeg, solidPng } from './test-images';

beforeEach(truncateAll);

describe('storeImage', () => {
  it('stores 320 px and 800 px WebP variants of a JPEG', async () => {
    const result = await storeImage(await noiseJpeg(1200, 900));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [row] = await db.select().from(images).where(eq(images.id, result.data.id));
    const small = await sharp(row!.small).metadata();
    const large = await sharp(row!.large).metadata();
    expect(small.format).toBe('webp');
    expect(small.width).toBe(320);
    expect(large.format).toBe('webp');
    expect(large.width).toBe(800);
  });

  it('accepts PNG input', async () => {
    expect((await storeImage(await solidPng())).ok).toBe(true);
  });

  it('accepts a 2 MB JPEG (the upload size the 6 MB action limit must allow)', async () => {
    const big = await noiseJpeg(1800, 1400, 95);
    expect(big.byteLength).toBeGreaterThan(2 * 1024 * 1024);
    expect(big.byteLength).toBeLessThan(MAX_IMAGE_BYTES);
    expect((await storeImage(big)).ok).toBe(true);
  });

  it('returns the same id for identical bytes', async () => {
    const bytes = await noiseJpeg(400, 300);
    const first = await storeImage(bytes);
    const second = await storeImage(bytes);
    expect(first.ok && second.ok && first.data.id === second.data.id).toBe(true);
    expect(await db.$count(images)).toBe(1);
  });

  it('rejects files over 5 MB', async () => {
    const result = await storeImage(Buffer.alloc(MAX_IMAGE_BYTES + 1));
    expect(result).toEqual({ ok: false, error: { code: 'invalid_image' } });
  });

  it('rejects files that are not JPEG, PNG or WebP', async () => {
    const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#fff' } })
      .gif()
      .toBuffer();
    expect((await storeImage(gif)).ok).toBe(false);
    expect((await storeImage(Buffer.from('not an image'))).ok).toBe(false);
  });
});

describe('deleteImageIfUnused', () => {
  it('deletes an unreferenced image', async () => {
    const stored = await storeImage(await solidPng());
    if (!stored.ok) throw new Error('setup');
    await deleteImageIfUnused(stored.data.id);
    expect(await db.$count(images)).toBe(0);
  });

  it('keeps an image a dish still uses', async () => {
    const stored = await storeImage(await solidPng());
    if (!stored.ok) throw new Error('setup');
    const kitchen = await makeKitchen();
    const category = await makeCategory(kitchen.id);
    const dish = await makeDish(kitchen.id, category.id, { photoImageId: stored.data.id });
    await deleteImageIfUnused(stored.data.id);
    expect(await db.$count(images)).toBe(1);
    await db.update(dishes).set({ photoImageId: null }).where(eq(dishes.id, dish.id));
    await deleteImageIfUnused(stored.data.id);
    expect(await db.$count(images)).toBe(0);
  });
});
