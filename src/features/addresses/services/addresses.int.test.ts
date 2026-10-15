import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { testOgg, testWebm } from '@/shared/audio/test-audio';
import { db } from '@/shared/db/client';
import { audioClips, customerAddresses, orders } from '@/shared/db/schema';
import { customerActor } from '@/shared/db/test/actors';
import { makeOrder, truncateAll } from '@/shared/db/test/helpers';
import { deleteAddress, saveAddress } from './addresses';

beforeEach(truncateAll);

const valid = {
  label: 'home',
  house: 'Door 2-114, Nayak House',
  street: 'Prabhatnagar 2nd cross',
  landmark: 'Behind Prabhatnagar temple',
  riderNote: 'Blue gate',
  lat: 14.2845,
  lng: 74.451,
  geocodedText: 'Prabhatnagar, Honnavar',
};

async function load(id: string) {
  const [row] = await db.select().from(customerAddresses).where(eq(customerAddresses.id, id));
  return row;
}

describe('saveAddress (FR-008, FR-054)', () => {
  it('saves a new address for the customer', async () => {
    const customer = await customerActor();
    const result = await saveAddress(customer, valid);
    if (!result.ok) throw new Error(result.error.code);
    expect(await load(result.data.id)).toMatchObject({ ...valid, customerId: customer.customerId, voiceNoteId: null });
  });

  it('accepts lat and lng sent as form text, and leaves optional fields empty', async () => {
    const customer = await customerActor();
    const result = await saveAddress(customer, { label: 'work', house: 'Shop 7', landmark: 'Opposite bus stand', lat: '14.2798', lng: '74.4442', street: '', riderNote: '' });
    if (!result.ok) throw new Error(result.error.code);
    expect(await load(result.data.id)).toMatchObject({ street: null, riderNote: null, geocodedText: null, lat: 14.2798 });
  });

  it('enforces the field limits', async () => {
    const customer = await customerActor();
    const cases: [Record<string, unknown>, string][] = [
      [{ house: '' }, 'house'],
      [{ house: 'x'.repeat(101) }, 'house'],
      [{ street: 'x'.repeat(151) }, 'street'],
      [{ landmark: '' }, 'landmark'],
      [{ landmark: 'x'.repeat(101) }, 'landmark'],
      [{ riderNote: 'x'.repeat(201) }, 'riderNote'],
      [{ geocodedText: 'x'.repeat(301) }, 'geocodedText'],
      [{ label: 'office' }, 'label'],
      [{ lat: 40 }, 'lat'],
      [{ lng: 60 }, 'lng'],
    ];
    for (const [change, field] of cases) {
      const result = await saveAddress(customer, { ...valid, ...change });
      expect(result.ok, field).toBe(false);
      if (!result.ok) expect(Object.keys(result.error.fieldErrors ?? {}), field).toContain(field);
    }
  });

  it('keeps at most 10 addresses per customer', async () => {
    const customer = await customerActor();
    for (let i = 0; i < 10; i += 1) expect((await saveAddress(customer, valid)).ok).toBe(true);
    expect(await saveAddress(customer, valid)).toMatchObject({ ok: false, error: { code: 'address_limit' } });
  });

  it('edits only the customer’s own address', async () => {
    const owner = await customerActor();
    const other = await customerActor();
    const created = await saveAddress(owner, valid);
    if (!created.ok) throw new Error();
    expect(await saveAddress(other, { ...valid, id: created.data.id })).toMatchObject({ ok: false, error: { code: 'not_found' } });
    expect((await saveAddress(owner, { ...valid, id: created.data.id, landmark: 'Near the school' })).ok).toBe(true);
    expect((await load(created.data.id))!.landmark).toBe('Near the school');
  });

  it('stores, replaces and removes the landmark voice note, deleting clips nothing uses', async () => {
    const customer = await customerActor();
    const created = await saveAddress(customer, valid, { bytes: testWebm(), mime: 'audio/webm;codecs=opus' });
    if (!created.ok) throw new Error(created.error.code);
    const first = (await load(created.data.id))!.voiceNoteId;
    expect(first).not.toBeNull();

    await saveAddress(customer, { ...valid, id: created.data.id }, { bytes: testOgg(), mime: 'audio/ogg' });
    const second = (await load(created.data.id))!.voiceNoteId;
    expect(second).not.toBe(first);
    expect(await db.$count(audioClips)).toBe(1);

    await saveAddress(customer, { ...valid, id: created.data.id, removeVoiceNote: 'on' });
    expect((await load(created.data.id))!.voiceNoteId).toBeNull();
    expect(await db.$count(audioClips)).toBe(0);
  });

  it('rejects a voice note that is not audio', async () => {
    const customer = await customerActor();
    expect(await saveAddress(customer, valid, { bytes: Buffer.from('hello'), mime: 'audio/webm' })).toMatchObject({
      ok: false,
      error: { code: 'invalid', fieldErrors: { voiceNote: 'invalidAudio' } },
    });
  });
});

describe('deleteAddress', () => {
  it('deletes the customer’s address and its unused voice note; others get not_found', async () => {
    const customer = await customerActor();
    const created = await saveAddress(customer, valid, { bytes: testWebm(), mime: 'audio/webm' });
    if (!created.ok) throw new Error();
    const other = await customerActor();
    expect(await deleteAddress(other, { id: created.data.id })).toMatchObject({ ok: false, error: { code: 'not_found' } });
    expect((await deleteAddress(customer, { id: created.data.id })).ok).toBe(true);
    expect(await load(created.data.id)).toBeUndefined();
    expect(await db.$count(audioClips)).toBe(0);
  });

  it('editing and deleting an address used by an order leaves the order’s snapshot and voice note unchanged', async () => {
    const customer = await customerActor();
    const created = await saveAddress(customer, valid, { bytes: testWebm(), mime: 'audio/webm' });
    if (!created.ok) throw new Error();
    const clipId = (await load(created.data.id))!.voiceNoteId!;
    const order = await makeOrder({ customerId: customer.customerId, addressId: created.data.id, voiceNoteId: clipId });

    await saveAddress(customer, { ...valid, id: created.data.id, house: 'New house', removeVoiceNote: 'on' });
    await deleteAddress(customer, { id: created.data.id });

    const [after] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(after).toMatchObject({ addrHouse: order.addrHouse, addrLandmark: order.addrLandmark, addrVoiceNoteId: clipId, addressId: null });
    expect(await db.$count(audioClips)).toBe(1);
  });
});
