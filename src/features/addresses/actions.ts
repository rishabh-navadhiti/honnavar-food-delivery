'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { currentCustomer } from '@/features/auth/actor';
import { safeNext } from '@/features/auth/surfaces';
import { log } from '@/shared/log';
import type { ResultError } from '@/shared/result';
import { deleteAddress, saveAddress, type VoiceNoteUpload } from './services/addresses';

export type AddressFormState = { error?: ResultError };

const ADDRESS_FIELDS = ['id', 'label', 'labelText', 'house', 'street', 'landmark', 'riderNote', 'lat', 'lng', 'geocodedText', 'removeVoiceNote'];

/** Save an address with its optional voice note, then go back to where the customer came from. */
export async function saveAddressAction(_previous: AddressFormState, formData: FormData): Promise<AddressFormState> {
  const actor = await currentCustomer();
  if (!actor) return { error: { code: 'unauthorised' } };
  const input: Record<string, unknown> = Object.fromEntries(ADDRESS_FIELDS.map((name) => [name, formData.get(name) ?? undefined]));
  if (!input.id) delete input.id;
  const file = formData.get('voiceNote');
  let voiceNote: VoiceNoteUpload | null = null;
  if (file instanceof File && file.size > 0) voiceNote = { bytes: Buffer.from(await file.arrayBuffer()), mime: file.type };
  try {
    const result = await saveAddress(actor, input, voiceNote);
    if (!result.ok) return { error: result.error };
  } catch (error) {
    log.error('saveAddressAction failed', { action: 'saveAddressAction', surface: 'customer', subjectId: actor.customerId, error });
    return { error: { code: 'unexpected' } };
  }
  revalidatePath('/addresses');
  revalidatePath('/cart');
  redirect(safeNext('customer', String(formData.get('next') ?? '/addresses')));
}

export async function deleteAddressAction(formData: FormData): Promise<void> {
  const actor = await currentCustomer();
  if (!actor) redirect('/login?next=/addresses');
  try {
    await deleteAddress(actor, { id: formData.get('id') });
  } catch (error) {
    log.error('deleteAddressAction failed', { action: 'deleteAddressAction', surface: 'customer', subjectId: actor.customerId, error });
  }
  revalidatePath('/addresses');
  redirect('/addresses');
}
