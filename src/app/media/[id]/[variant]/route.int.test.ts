import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { truncateAll } from '@/shared/db/test/helpers';
import { storeImage } from '@/shared/images/store';
import { solidPng } from '@/shared/images/test-images';
import { GET } from './route';

beforeEach(truncateAll);

const call = (id: string, variant: string) =>
  GET(new Request(`http://localhost/media/${id}/${variant}`), { params: Promise.resolve({ id, variant }) });

describe('GET /media/[id]/[variant]', () => {
  it('serves both variants as cacheable WebP', async () => {
    const stored = await storeImage(await solidPng());
    if (!stored.ok) throw new Error('setup');
    for (const variant of ['s', 'l']) {
      const response = await call(stored.data.id, variant);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('image/webp');
      expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
      expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
    }
  });

  it('returns 404 for an unknown id', async () => {
    expect((await call(randomUUID(), 's')).status).toBe(404);
  });

  it('returns 404 for a malformed id', async () => {
    expect((await call('not-a-uuid', 's')).status).toBe(404);
  });

  it('returns 404 for an unknown variant', async () => {
    const stored = await storeImage(await solidPng());
    if (!stored.ok) throw new Error('setup');
    expect((await call(stored.data.id, 'x')).status).toBe(404);
  });
});
