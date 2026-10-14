import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { dishes, kitchenContacts, kitchenHours, kitchens, kitchenSignins, verifications } from '@/shared/db/schema';
import { deleteImageIfUnused, storeImage } from '@/shared/images/store';
import { err, ok, type Result } from '@/shared/result';
import { parseInput } from '@/shared/validation';
import type { Actor } from '../../auth/actor-scope';
import { WEEKDAYS } from '../domain/hours';
import { kitchenProfileSchema, signinListSchema, statusSchema, type KitchenProfileInput } from '../admin-schemas';
import { parseWeekHours, type WeekHoursInput } from '../schemas';

export function requireAdmin(actor: Actor): Result<{ adminId: string }> {
  return actor.role === 'admin' ? ok({ adminId: actor.adminId }) : err('unauthorised');
}

/** The kitchen that already signs in with one of these numbers, if any (FR-025). */
export async function signinOwner(phones: string[], exceptKitchenId?: string): Promise<string | null> {
  if (phones.length === 0) return null;
  const [row] = await db
    .select({ kitchenId: kitchenSignins.kitchenId, nameEn: kitchens.nameEn, nameKn: kitchens.nameKn })
    .from(kitchenSignins)
    .innerJoin(kitchens, eq(kitchens.id, kitchenSignins.kitchenId))
    .where(inArray(kitchenSignins.phone, phones));
  if (!row || row.kitchenId === exceptKitchenId) return null;
  return row.nameEn ?? row.nameKn ?? '';
}

type CreateInput = KitchenProfileInput & {
  signins: { phone: string; personName: string }[];
  hours: WeekHoursInput;
  photo?: Buffer | null;
};

/** Onboard a kitchen (FR-019, FR-020): always starts Pending and invisible to customers. */
export async function createKitchen(actor: Actor, input: CreateInput): Promise<Result<{ id: string }>> {
  const admin = requireAdmin(actor);
  if (!admin.ok) return admin;
  const profile = parseInput(kitchenProfileSchema, input);
  const signins = parseInput(signinListSchema, input.signins);
  const hours = parseWeekHours(input.hours);
  const fieldErrors = {
    ...(profile.ok ? {} : profile.error.fieldErrors),
    ...(signins.ok ? {} : { signins: signins.error.fieldErrors?._form ?? 'invalid' }),
    ...(hours.ok ? {} : hours.error.fieldErrors),
  };
  if (!profile.ok || !signins.ok || !hours.ok) return err('invalid', fieldErrors);

  const taken = await signinOwner(signins.data.map((s) => s.phone));
  if (taken !== null) return err('signin_phone_taken', undefined, { kitchenName: taken });

  let photoImageId: string | null = null;
  if (input.photo) {
    const stored = await storeImage(input.photo);
    if (!stored.ok) return err('invalid', { photo: 'invalidImage' });
    photoImageId = stored.data.id;
  }

  const p = profile.data;
  const now = new Date();
  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(kitchens)
      .values({
        nameEn: p.name.en,
        nameKn: p.name.kn,
        descriptionEn: p.description.en,
        descriptionKn: p.description.kn,
        type: p.type,
        pureVeg: p.pureVeg,
        address: p.address,
        landmark: p.landmark,
        photoImageId,
        status: 'pending',
        hoursUpdatedByRole: 'admin',
        hoursUpdatedByPhone: actor.phone,
        hoursUpdatedAt: now,
      })
      .returning({ id: kitchens.id });
    const kitchenId = row!.id;
    await tx.insert(kitchenContacts).values(p.contacts.map((c, position) => ({ kitchenId, ...c, position })));
    await tx.insert(kitchenSignins).values(signins.data.map((s) => ({ kitchenId, ...s })));
    const hourRows = WEEKDAYS.flatMap((weekday) =>
      hours.data[weekday].map((r, i) => ({ kitchenId, weekday, slot: i + 1, opensMin: r.opens, closesMin: r.closes })),
    );
    if (hourRows.length > 0) await tx.insert(kitchenHours).values(hourRows);
    return kitchenId;
  });
  return ok({ id });
}

/** Edit the admin-managed profile (FR-019, FR-038). Pure veg cannot hide existing non-veg dishes (FR-035). */
export async function updateKitchenProfile(
  actor: Actor,
  input: KitchenProfileInput & { kitchenId: string },
): Promise<Result<object>> {
  const admin = requireAdmin(actor);
  if (!admin.ok) return admin;
  const profile = parseInput(kitchenProfileSchema, input);
  if (!profile.ok) return profile;
  const p = profile.data;
  const [existing] = await db.select({ id: kitchens.id }).from(kitchens).where(eq(kitchens.id, input.kitchenId));
  if (!existing) return err('not_found');
  if (p.pureVeg) {
    const nonVegCount = await db.$count(dishes, and(eq(dishes.kitchenId, input.kitchenId), eq(dishes.isVeg, false)));
    if (nonVegCount > 0) return err('pure_veg_conflict', undefined, { nonVegCount });
  }
  await db.transaction(async (tx) => {
    await tx
      .update(kitchens)
      .set({
        nameEn: p.name.en,
        nameKn: p.name.kn,
        descriptionEn: p.description.en,
        descriptionKn: p.description.kn,
        type: p.type,
        pureVeg: p.pureVeg,
        address: p.address,
        landmark: p.landmark,
        updatedAt: new Date(),
      })
      .where(eq(kitchens.id, input.kitchenId));
    await tx.delete(kitchenContacts).where(eq(kitchenContacts.kitchenId, input.kitchenId));
    await tx.insert(kitchenContacts).values(p.contacts.map((c, position) => ({ kitchenId: input.kitchenId, ...c, position })));
  });
  return ok({});
}

/** Store, replace or (with null) remove the kitchen photo. */
export async function setKitchenPhoto(
  actor: Actor,
  input: { kitchenId: string; photo: Buffer | null },
): Promise<Result<object>> {
  const admin = requireAdmin(actor);
  if (!admin.ok) return admin;
  const [existing] = await db.select({ photoImageId: kitchens.photoImageId }).from(kitchens).where(eq(kitchens.id, input.kitchenId));
  if (!existing) return err('not_found');
  let photoImageId: string | null = null;
  if (input.photo) {
    const stored = await storeImage(input.photo);
    if (!stored.ok) return err('invalid', { photo: 'invalidImage' });
    photoImageId = stored.data.id;
  }
  await db.update(kitchens).set({ photoImageId, updatedAt: new Date() }).where(eq(kitchens.id, input.kitchenId));
  if (existing.photoImageId && existing.photoImageId !== photoImageId) await deleteImageIfUnused(existing.photoImageId);
  return ok({});
}

/**
 * Move between Pending, Active and Suspended (FR-020): activation needs a recorded verification
 * (FR-022); suspension needs a reason.
 */
export async function setKitchenStatus(
  actor: Actor,
  input: { kitchenId: string; status: 'pending' | 'active' | 'suspended'; reason?: string },
): Promise<Result<object>> {
  const admin = requireAdmin(actor);
  if (!admin.ok) return admin;
  const parsed = parseInput(statusSchema, input);
  if (!parsed.ok) return parsed;
  const { kitchenId, status, reason } = parsed.data;
  const [existing] = await db.select({ id: kitchens.id }).from(kitchens).where(eq(kitchens.id, kitchenId));
  if (!existing) return err('not_found');
  if (status === 'active' && (await db.$count(verifications, eq(verifications.kitchenId, kitchenId))) === 0) {
    return err('needs_verification');
  }
  if (status === 'suspended' && !reason) return err('reason_required');
  await db
    .update(kitchens)
    .set({ status, suspensionReason: status === 'suspended' ? reason! : null, updatedAt: new Date() })
    .where(eq(kitchens.id, kitchenId));
  return ok({});
}
