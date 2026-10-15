import 'server-only';
import { and, count, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { CustomerActor } from '@/features/auth/actor-scope';
import { deleteAudioIfUnused, storeAudio } from '@/shared/audio/store';
import { db } from '@/shared/db/client';
import { customerAddresses } from '@/shared/db/schema';
import { err, ok, type Result } from '@/shared/result';
import { fields, parseInput } from '@/shared/validation';
import { addressSchema } from '../schemas';

export const MAX_ADDRESSES = 10;

export type VoiceNoteUpload = { bytes: Buffer; mime: string };

/**
 * Add or edit one of the customer's saved addresses (FR-008, FR-054), optionally with a landmark
 * voice note stored as recorded (FR-055). Orders keep their own snapshot, so edits never change them.
 */
export async function saveAddress(
  actor: CustomerActor,
  input: unknown,
  voiceNote?: VoiceNoteUpload | null,
): Promise<Result<{ id: string }>> {
  const parsed = parseInput(addressSchema, input);
  if (!parsed.ok) return parsed;
  const { id, removeVoiceNote, ...values } = parsed.data;

  let existingVoiceNoteId: string | null = null;
  if (id) {
    const [existing] = await db
      .select({ voiceNoteId: customerAddresses.voiceNoteId })
      .from(customerAddresses)
      .where(and(eq(customerAddresses.id, id), eq(customerAddresses.customerId, actor.customerId)));
    if (!existing) return err('not_found');
    existingVoiceNoteId = existing.voiceNoteId;
  } else {
    const [row] = await db.select({ n: count() }).from(customerAddresses).where(eq(customerAddresses.customerId, actor.customerId));
    if ((row?.n ?? 0) >= MAX_ADDRESSES) return err('address_limit');
  }

  return db.transaction(async (tx) => {
    let voiceNoteId = removeVoiceNote ? null : existingVoiceNoteId;
    if (voiceNote) {
      const stored = await storeAudio(voiceNote.bytes, voiceNote.mime, tx);
      if (!stored.ok) return err('invalid', { voiceNote: 'invalidAudio' });
      voiceNoteId = stored.data.id;
    }
    const row = {
      label: values.label,
      labelText: values.label === 'other' ? (values.labelText ?? null) : null,
      house: values.house,
      street: values.street ?? null,
      landmark: values.landmark,
      riderNote: values.riderNote ?? null,
      lat: values.lat,
      lng: values.lng,
      geocodedText: values.geocodedText ?? null,
      voiceNoteId,
      updatedAt: new Date(),
    };
    let savedId = id;
    if (id) {
      await tx.update(customerAddresses).set(row).where(eq(customerAddresses.id, id));
    } else {
      const [created] = await tx.insert(customerAddresses).values({ ...row, customerId: actor.customerId }).returning({ id: customerAddresses.id });
      savedId = created!.id;
    }
    if (existingVoiceNoteId && existingVoiceNoteId !== voiceNoteId) await deleteAudioIfUnused(existingVoiceNoteId, tx);
    return ok({ id: savedId! });
  });
}

const deleteSchema = z.object({ id: fields.id() });

export async function deleteAddress(actor: CustomerActor, input: unknown): Promise<Result<object>> {
  const parsed = parseInput(deleteSchema, input);
  if (!parsed.ok) return parsed;
  return db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(customerAddresses)
      .where(and(eq(customerAddresses.id, parsed.data.id), eq(customerAddresses.customerId, actor.customerId)))
      .returning({ voiceNoteId: customerAddresses.voiceNoteId });
    if (!deleted) return err('not_found');
    if (deleted.voiceNoteId) await deleteAudioIfUnused(deleted.voiceNoteId, tx);
    return ok({});
  });
}
