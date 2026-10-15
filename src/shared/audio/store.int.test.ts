import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/client';
import { audioClips, customerAddresses } from '../db/schema';
import { makeAddress, makeCustomer, makeOrder, truncateAll } from '../db/test/helpers';
import { deleteAudioIfUnused, MAX_AUDIO_BYTES, readAudio, storeAudio } from './store';
import { testMp4, testOgg, testWebm } from './test-audio';

beforeEach(truncateAll);

describe('storeAudio (research R9)', () => {
  it('accepts WebM, Ogg and MP4 whose bytes match their type', async () => {
    for (const [bytes, mime] of [
      [testWebm(), 'audio/webm'],
      [testOgg(), 'audio/ogg'],
      [testMp4(), 'audio/mp4'],
    ] as const) {
      const stored = await storeAudio(bytes, mime);
      expect(stored.ok, mime).toBe(true);
    }
    expect(await db.$count(audioClips)).toBe(3);
  });

  it('keeps the mime type without codec parameters, and serves the bytes back', async () => {
    const stored = await storeAudio(testWebm(), 'audio/webm;codecs=opus');
    if (!stored.ok) throw new Error();
    expect(await readAudio(stored.data.id)).toEqual({ mime: 'audio/webm', bytes: testWebm() });
  });

  it('rejects other types, mismatched bytes, empty clips and anything over 600 KB', async () => {
    expect(MAX_AUDIO_BYTES).toBe(600 * 1024);
    expect(await storeAudio(testWebm(), 'audio/mpeg')).toMatchObject({ ok: false, error: { code: 'invalid_audio' } });
    expect(await storeAudio(testOgg(), 'audio/webm')).toMatchObject({ ok: false, error: { code: 'invalid_audio' } });
    expect(await storeAudio(Buffer.alloc(0), 'audio/webm')).toMatchObject({ ok: false, error: { code: 'invalid_audio' } });
    const big = Buffer.concat([testWebm(), Buffer.alloc(MAX_AUDIO_BYTES)]);
    expect(await storeAudio(big, 'audio/webm')).toMatchObject({ ok: false, error: { code: 'invalid_audio' } });
  });

  it('reuses the row for identical bytes', async () => {
    const a = await storeAudio(testWebm(), 'audio/webm');
    const b = await storeAudio(testWebm(), 'audio/webm');
    if (!a.ok || !b.ok) throw new Error();
    expect(a.data.id).toBe(b.data.id);
  });
});

describe('deleteAudioIfUnused', () => {
  it('keeps a clip an address or an order still uses, and deletes it once nothing does', async () => {
    const stored = await storeAudio(testWebm(), 'audio/webm');
    if (!stored.ok) throw new Error();
    const clipId = stored.data.id;
    const customer = await makeCustomer();
    const address = await makeAddress(customer.id, { voiceNoteId: clipId });
    const order = await makeOrder({ customerId: customer.id, voiceNoteId: clipId });

    await deleteAudioIfUnused(clipId);
    expect(await db.$count(audioClips)).toBe(1);

    await db.delete(customerAddresses).where(eq(customerAddresses.id, address.id));
    await deleteAudioIfUnused(clipId);
    expect(await db.$count(audioClips)).toBe(1); // the order snapshot still uses it
    expect(order.addrVoiceNoteId).toBe(clipId);
  });

  it('deletes a clip nobody uses', async () => {
    const stored = await storeAudio(testOgg(), 'audio/ogg');
    if (!stored.ok) throw new Error();
    await deleteAudioIfUnused(stored.data.id);
    expect(await db.$count(audioClips)).toBe(0);
  });
});
