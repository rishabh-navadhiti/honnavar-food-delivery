import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/shared/db/client';
import { dishes, images, kitchenContacts, kitchens, kitchenSignins, sessions, verifications } from '@/shared/db/schema';
import { adminActor, partnerActor } from '@/shared/db/test/actors';
import { makeCategory, makeDish, makeKitchen, makeSignin, truncateAll } from '@/shared/db/test/helpers';
import { solidPng } from '@/shared/images/test-images';
import { createSession, loadSession } from '../../auth/session-store';
import { saveDish } from '../../menu/services/dishes';
import { listKitchensForAdmin } from '../queries';
import { createKitchen, setKitchenPhoto, setKitchenStatus, updateKitchenProfile } from './admin';
import { closeTemporarily } from './operations';
import { addSignin, removeSignin } from './signins';
import { recordVerification } from './verification';

beforeEach(truncateAll);

const everyDay = (ranges: { opens: string; closes: string }[]) =>
  Object.fromEntries(['1', '2', '3', '4', '5', '6', '7'].map((d) => [d, ranges]));

const newKitchen = {
  name: { en: 'Kerekon Kitchen', kn: 'ಕೆರೆಕೋಣ ಅಡುಗೆ' },
  description: { en: 'Home food' },
  type: 'home_kitchen' as const,
  pureVeg: true,
  address: 'Kerekon, Honnavar',
  landmark: 'Near the school',
  contacts: [{ phone: '9000005001', isPrimary: true }],
  signins: [{ phone: '9000005101', personName: 'Owner' }],
  hours: everyDay([{ opens: '12:00', closes: '14:30' }]),
};

describe('createKitchen (FR-019, FR-020, FR-053)', () => {
  it('creates a pending kitchen with contacts, sign-ins and hours', async () => {
    const admin = await adminActor();
    const result = await createKitchen(admin, newKitchen);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    const [row] = await db.select().from(kitchens).where(eq(kitchens.id, result.data.id));
    expect(row).toMatchObject({ status: 'pending', nameEn: 'Kerekon Kitchen', hoursUpdatedByRole: 'admin' });
    expect(await db.$count(kitchenContacts, eq(kitchenContacts.kitchenId, result.data.id))).toBe(1);
    expect(await db.$count(kitchenSignins, eq(kitchenSignins.kitchenId, result.data.id))).toBe(1);
  });

  it('requires exactly one primary contact and at least one sign-in', async () => {
    const admin = await adminActor();
    const noPrimary = await createKitchen(admin, { ...newKitchen, contacts: [{ phone: '9000005001', isPrimary: false }] });
    expect(noPrimary.ok || noPrimary.error.fieldErrors?.contacts).toBe('primaryContactRequired');
    const noSignin = await createKitchen(admin, { ...newKitchen, signins: [] });
    expect(noSignin.ok || noSignin.error.fieldErrors?.signins).toBe('signinRequired');
  });

  it('refuses a sign-in number already used by another kitchen', async () => {
    const admin = await adminActor();
    const other = await makeKitchen({ nameEn: 'Other Kitchen' });
    await makeSignin(other.id, { phone: '9000005101' });
    expect(await createKitchen(admin, newKitchen)).toEqual({
      ok: false,
      error: { code: 'signin_phone_taken', details: { kitchenName: 'Other Kitchen' } },
    });
  });

  it('is admin-only', async () => {
    const kitchen = await makeKitchen();
    const partner = await partnerActor(kitchen.id);
    expect(await createKitchen(partner, newKitchen)).toEqual({ ok: false, error: { code: 'unauthorised' } });
  });
});

describe('updateKitchenProfile and photo', () => {
  it('refuses to declare a kitchen pure veg while it has non-veg dishes', async () => {
    const admin = await adminActor();
    const kitchen = await makeKitchen({ pureVeg: false });
    const category = await makeCategory(kitchen.id);
    await makeDish(kitchen.id, category.id, { isVeg: false });
    await makeDish(kitchen.id, category.id, { isVeg: false });
    const result = await updateKitchenProfile(admin, { ...newKitchen, kitchenId: kitchen.id, pureVeg: true });
    expect(result).toEqual({ ok: false, error: { code: 'pure_veg_conflict', details: { nonVegCount: 2 } } });
  });

  it('replaces contacts', async () => {
    const admin = await adminActor();
    const kitchen = await makeKitchen();
    const result = await updateKitchenProfile(admin, {
      ...newKitchen,
      kitchenId: kitchen.id,
      pureVeg: false,
      contacts: [
        { phone: '9000005002', isPrimary: false },
        { phone: '9000005003', isPrimary: true },
      ],
    });
    expect(result.ok).toBe(true);
    const contacts = await db.select().from(kitchenContacts).where(eq(kitchenContacts.kitchenId, kitchen.id));
    expect(contacts.map((c) => [c.phone, c.isPrimary]).sort()).toEqual([
      ['9000005002', false],
      ['9000005003', true],
    ]);
  });

  it('stores, replaces and removes the kitchen photo', async () => {
    const admin = await adminActor();
    const kitchen = await makeKitchen();
    expect((await setKitchenPhoto(admin, { kitchenId: kitchen.id, photo: await solidPng() })).ok).toBe(true);
    expect((await setKitchenPhoto(admin, { kitchenId: kitchen.id, photo: await solidPng(800, 600) })).ok).toBe(true);
    expect(await db.$count(images)).toBe(1);
    expect((await setKitchenPhoto(admin, { kitchenId: kitchen.id, photo: null })).ok).toBe(true);
    expect(await db.$count(images)).toBe(0);
  });
});

describe('sign-in list (FR-053)', () => {
  it('adds a helper and refuses a number used elsewhere', async () => {
    const admin = await adminActor();
    const kitchen = await makeKitchen();
    const other = await makeKitchen({ nameEn: 'Elsewhere' });
    await makeSignin(other.id, { phone: '9000005201' });
    expect((await addSignin(admin, { kitchenId: kitchen.id, phone: '9000005202', personName: 'Helper' })).ok).toBe(true);
    expect(await addSignin(admin, { kitchenId: kitchen.id, phone: '9000005201', personName: 'X' })).toEqual({
      ok: false,
      error: { code: 'signin_phone_taken', details: { kitchenName: 'Elsewhere' } },
    });
  });

  it('removes a helper and ends their sessions, but never the last number', async () => {
    const admin = await adminActor();
    const kitchen = await makeKitchen();
    const owner = await makeSignin(kitchen.id);
    const helper = await makeSignin(kitchen.id);
    const { token } = await createSession({ surface: 'partner', phone: helper.phone, subjectId: helper.id, kitchenId: kitchen.id });
    expect((await removeSignin(admin, { kitchenId: kitchen.id, signinId: helper.id })).ok).toBe(true);
    expect(await db.$count(sessions)).toBe(0);
    expect(await loadSession('partner', token)).toBeNull();
    expect(await removeSignin(admin, { kitchenId: kitchen.id, signinId: owner.id })).toEqual({
      ok: false,
      error: { code: 'last_signin' },
    });
  });
});

describe('verification and status (FR-021, FR-022)', () => {
  it('requires a 14-digit FSSAI number for restaurants and cloud kitchens', async () => {
    const admin = await adminActor();
    const kitchen = await makeKitchen({ type: 'restaurant' });
    expect(await recordVerification(admin, { kitchenId: kitchen.id, kind: 'fssai_licence', reference: '123' })).toEqual({
      ok: false,
      error: { code: 'invalid', fieldErrors: { reference: 'invalidFssai' } },
    });
    expect(await recordVerification(admin, { kitchenId: kitchen.id, kind: 'hygiene_check', reference: 'HC-1' })).toEqual({
      ok: false,
      error: { code: 'kind_mismatch' },
    });
    expect((await recordVerification(admin, { kitchenId: kitchen.id, kind: 'fssai_licence', reference: '12345678901234' })).ok).toBe(true);
    const [row] = await db.select().from(verifications);
    expect(row).toMatchObject({ reference: '12345678901234', verifiedByAdminId: (admin as { adminId: string }).adminId });
  });

  it('requires a 3–40 character hygiene reference for home kitchens', async () => {
    const admin = await adminActor();
    const kitchen = await makeKitchen({ type: 'home_kitchen' });
    expect(await recordVerification(admin, { kitchenId: kitchen.id, kind: 'hygiene_check', reference: 'ab' })).toEqual({
      ok: false,
      error: { code: 'invalid', fieldErrors: { reference: 'invalidHygieneRef' } },
    });
    expect((await recordVerification(admin, { kitchenId: kitchen.id, kind: 'hygiene_check', reference: 'HC-2026-099' })).ok).toBe(true);
  });

  it('activates only after verification and suspends only with a reason', async () => {
    const admin = await adminActor();
    const kitchen = await makeKitchen({ type: 'home_kitchen', status: 'pending' });
    expect(await setKitchenStatus(admin, { kitchenId: kitchen.id, status: 'active' })).toEqual({
      ok: false,
      error: { code: 'needs_verification' },
    });
    await recordVerification(admin, { kitchenId: kitchen.id, kind: 'hygiene_check', reference: 'HC-2026-099' });
    expect((await setKitchenStatus(admin, { kitchenId: kitchen.id, status: 'active' })).ok).toBe(true);
    expect(await setKitchenStatus(admin, { kitchenId: kitchen.id, status: 'suspended', reason: ' ' })).toEqual({
      ok: false,
      error: { code: 'reason_required' },
    });
    expect((await setKitchenStatus(admin, { kitchenId: kitchen.id, status: 'suspended', reason: 'Complaint' })).ok).toBe(true);
    const [row] = await db.select().from(kitchens).where(eq(kitchens.id, kitchen.id));
    expect(row).toMatchObject({ status: 'suspended', suspensionReason: 'Complaint' });
    expect((await setKitchenStatus(admin, { kitchenId: kitchen.id, status: 'pending' })).ok).toBe(true);
  });
});

describe('admin edits on behalf of partners (FR-054, FR-055)', () => {
  it('stamps menu and closure changes with the admin', async () => {
    const admin = await adminActor();
    const kitchen = await makeKitchen();
    const category = await makeCategory(kitchen.id);
    const dish = await makeDish(kitchen.id, category.id);
    const saved = await saveDish(admin, {
      kitchenId: kitchen.id,
      id: dish.id,
      categoryId: category.id,
      name: { en: 'Neer dose', kn: 'ನೀರ್ ದೋಸೆ' },
      priceRupees: 65,
      isVeg: true,
      available: true,
    });
    expect(saved.ok).toBe(true);
    const [row] = await db.select().from(dishes).where(eq(dishes.id, dish.id));
    expect(row).toMatchObject({ priceRupees: 65, updatedByRole: 'admin', updatedByPhone: admin.phone });
    await closeTemporarily(admin, { kitchenId: kitchen.id }, new Date('2026-10-12T12:00:00+05:30'));
    const [k] = await db.select().from(kitchens).where(eq(kitchens.id, kitchen.id));
    expect(k).toMatchObject({ closureUpdatedByRole: 'admin', closureUpdatedByPhone: admin.phone });
  });
});

describe('listKitchensForAdmin (FR-024)', () => {
  it('filters by status and type and searches names and phones', async () => {
    const a = await makeKitchen({ nameEn: 'Sagara Fish', nameKn: 'ಸಾಗರ ಮೀನು', type: 'restaurant' }, { contactPhone: '9000006001' });
    const b = await makeKitchen({ nameEn: 'Goli Corner', type: 'cloud_kitchen', status: 'pending' });
    await makeSignin(b.id, { phone: '9000006102' });
    const ids = async (filters: Parameters<typeof listKitchensForAdmin>[0]) =>
      (await listKitchensForAdmin(filters)).map((k) => k.id).sort();
    expect(await ids({ status: 'pending' })).toEqual([b.id]);
    expect(await ids({ type: 'restaurant' })).toEqual([a.id]);
    expect(await ids({ q: 'ಸಾಗರ' })).toEqual([a.id]);
    expect(await ids({ q: 'goli' })).toEqual([b.id]);
    expect(await ids({ q: '90000 06001' })).toEqual([a.id]);
    expect(await ids({ q: '6102' })).toEqual([b.id]);
    expect(await ids({ status: 'active', q: 'goli' })).toEqual([]);
    expect((await ids({})).length).toBe(2);
  });

  it('includes each kitchen’s primary contact number', async () => {
    const kitchen = await makeKitchen({ nameEn: 'Primary Phone Kitchen' }, { contactPhone: '9000006501' });
    await db.insert(kitchenContacts).values({ kitchenId: kitchen.id, phone: '9000006502', isPrimary: false, position: 1 });
    const [row] = await listKitchensForAdmin({});
    expect(row).toMatchObject({ id: kitchen.id, primaryPhone: '9000006501' });
  });
});

describe('kitchen map location and preparation minutes (002 FR-037, FR-057)', () => {
  it('saves a location and preparation minutes on create and update, and can clear the location', async () => {
    const admin = await adminActor();
    const created = await createKitchen(admin, { ...newKitchen, location: { lat: 14.28, lng: 74.4445 }, prepMinutes: 30 });
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    const [row] = await db.select().from(kitchens).where(eq(kitchens.id, created.data.id));
    expect(row).toMatchObject({ locationLat: 14.28, locationLng: 74.4445, prepMinutes: 30 });
    expect((await updateKitchenProfile(admin, { kitchenId: created.data.id, ...newKitchen, location: null, prepMinutes: 20 })).ok).toBe(true);
    const [after] = await db.select().from(kitchens).where(eq(kitchens.id, created.data.id));
    expect(after).toMatchObject({ locationLat: null, locationLng: null, prepMinutes: 20 });
  });

  it('defaults preparation minutes to 25 and rejects values out of range', async () => {
    const admin = await adminActor();
    const created = await createKitchen(admin, newKitchen);
    if (!created.ok) throw new Error();
    expect((await db.select().from(kitchens).where(eq(kitchens.id, created.data.id)))[0]!.prepMinutes).toBe(25);
    for (const [change, field] of [
      [{ prepMinutes: 4 }, 'prepMinutes'],
      [{ prepMinutes: 121 }, 'prepMinutes'],
      [{ location: { lat: 40, lng: 74.4 } }, 'location.lat'],
      [{ location: { lat: 14.2, lng: 99 } }, 'location.lng'],
    ] as const) {
      const result = await createKitchen(admin, { ...newKitchen, signins: [{ phone: '9000005199', personName: 'X' }], ...change });
      expect(result.ok, field).toBe(false);
      if (!result.ok) expect(Object.keys(result.error.fieldErrors ?? {}), field).toContain(field);
    }
  });
});
