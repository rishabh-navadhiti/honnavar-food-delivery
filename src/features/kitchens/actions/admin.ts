'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { formChecked, formFile, formOptionalId, formText, formValues } from '@/shared/forms';
import { log } from '@/shared/log';
import type { Result, ResultError } from '@/shared/result';
import type { Actor } from '../../auth/actor-scope';
import { currentActor } from '../../auth/actor';
import { createKitchen, setKitchenPhoto, setKitchenStatus, updateKitchenProfile } from '../services/admin';
import { addSignin, removeSignin } from '../services/signins';
import { recordVerification } from '../services/verification';

export type AdminFormState = { values?: Record<string, string>; error?: ResultError; saved?: boolean };

const ROWS = [1, 2, 3];

async function asAdmin<T>(action: string, run: (actor: Actor) => Promise<Result<T>>): Promise<Result<T>> {
  const actor = await currentActor('admin');
  if (!actor) return { ok: false, error: { code: 'unauthorised' } };
  try {
    return await run(actor);
  } catch (error) {
    log.error(`${action} failed`, { action, surface: 'admin', subjectId: actor.role === 'admin' ? actor.adminId : null, error });
    return { ok: false, error: { code: 'unexpected' } };
  }
}

function readProfile(formData: FormData) {
  const primary = formText(formData, 'primaryContact');
  return {
    name: { en: formText(formData, 'nameEn'), kn: formText(formData, 'nameKn') },
    description: { en: formText(formData, 'descriptionEn'), kn: formText(formData, 'descriptionKn') },
    type: formText(formData, 'type') as 'restaurant' | 'home_kitchen' | 'cloud_kitchen',
    pureVeg: formChecked(formData, 'pureVeg'),
    address: formText(formData, 'address'),
    landmark: formText(formData, 'landmark'),
    contacts: ROWS.filter((n) => formText(formData, `contact${n}`).trim()).map((n) => ({
      phone: formText(formData, `contact${n}`),
      isPrimary: primary === String(n),
    })),
  };
}

/** Create a kitchen: profile, contacts, sign-in list, same hours every day, optional photo. */
export async function createKitchenAction(_previous: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const ranges = [1, 2]
    .map((n) => ({ opens: formText(formData, `opens${n}`).trim(), closes: formText(formData, `closes${n}`).trim() }))
    .filter((r) => r.opens || r.closes)
    .map((r) => ({ ...r, closes: r.closes === '00:00' ? '24:00' : r.closes }));
  const photo = await formFile(formData, 'photo');
  const result = await asAdmin('createKitchenAction', (actor) =>
    createKitchen(actor, {
      ...readProfile(formData),
      signins: ROWS.filter((n) => formText(formData, `signin${n}`).trim()).map((n) => ({
        phone: formText(formData, `signin${n}`),
        personName: formText(formData, `signinName${n}`),
      })),
      hours: Object.fromEntries(['1', '2', '3', '4', '5', '6', '7'].map((d) => [d, ranges])),
      photo: photo ?? null,
    }),
  );
  if (!result.ok) return { values: formValues(formData), error: result.error };
  revalidatePath('/', 'layout');
  redirect(`/admin/partners/${result.data.id}?created=1`);
}

export async function updateKitchenProfileAction(_previous: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const kitchenId = formText(formData, 'kitchenId');
  const result = await asAdmin('updateKitchenProfileAction', (actor) =>
    updateKitchenProfile(actor, { kitchenId, ...readProfile(formData) }),
  );
  if (!result.ok) return { values: formValues(formData), error: result.error };
  revalidatePath('/', 'layout');
  return { values: formValues(formData), saved: true };
}

export async function setKitchenPhotoAction(_previous: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const kitchenId = formText(formData, 'kitchenId');
  const photo = formChecked(formData, 'remove') ? null : await formFile(formData, 'photo');
  if (photo === undefined) return { error: { code: 'invalid', fieldErrors: { photo: 'invalidImage' } } };
  const result = await asAdmin('setKitchenPhotoAction', (actor) => setKitchenPhoto(actor, { kitchenId, photo }));
  if (!result.ok) return { error: result.error };
  revalidatePath('/', 'layout');
  return { saved: true };
}

export async function setKitchenStatusAction(_previous: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const result = await asAdmin('setKitchenStatusAction', (actor) =>
    setKitchenStatus(actor, {
      kitchenId: formText(formData, 'kitchenId'),
      status: formText(formData, 'status') as 'pending' | 'active' | 'suspended',
      reason: formText(formData, 'reason'),
    }),
  );
  if (!result.ok) return { values: formValues(formData), error: result.error };
  revalidatePath('/', 'layout');
  return { saved: true };
}

export async function recordVerificationAction(_previous: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const result = await asAdmin('recordVerificationAction', (actor) =>
    recordVerification(actor, {
      kitchenId: formText(formData, 'kitchenId'),
      kind: formText(formData, 'kind') as 'fssai_licence' | 'hygiene_check',
      reference: formText(formData, 'reference'),
    }),
  );
  if (!result.ok) return { values: formValues(formData), error: result.error };
  revalidatePath('/', 'layout');
  return { saved: true };
}

export async function addSigninAction(_previous: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const result = await asAdmin('addSigninAction', (actor) =>
    addSignin(actor, {
      kitchenId: formText(formData, 'kitchenId'),
      phone: formText(formData, 'phone'),
      personName: formText(formData, 'personName'),
    }),
  );
  if (!result.ok) return { values: formValues(formData), error: result.error };
  revalidatePath('/', 'layout');
  return { saved: true };
}

export async function removeSigninAction(_previous: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const result = await asAdmin('removeSigninAction', (actor) =>
    removeSignin(actor, { kitchenId: formText(formData, 'kitchenId'), signinId: formOptionalId(formData, 'signinId') ?? '' }),
  );
  if (!result.ok) return { error: result.error };
  revalidatePath('/', 'layout');
  return { saved: true };
}
