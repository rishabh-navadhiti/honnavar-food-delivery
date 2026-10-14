'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { log } from '@/shared/log';
import type { ResultError } from '@/shared/result';
import { getOptionalSession, clearSessionCookie, readSessionToken, setSessionCookie } from './session';
import { requestCode, signOut, updateCustomerName, verifyCode } from './services/sign-in';
import { safeNext, SURFACE_HOME, SURFACE_LOGIN, surfaces } from './surfaces';

export type SignInState = {
  step: 'phone' | 'code';
  phone: string;
  error?: ResultError;
};

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
};

/**
 * One action for both sign-in steps, for useActionState. Step 1 asks for a code; step 2 checks it,
 * sets the surface's session cookie and redirects (FR-003 to FR-006).
 */
export async function signInAction(previous: SignInState, formData: FormData): Promise<SignInState> {
  const surface = z.enum(surfaces).safeParse(text(formData, 'surface'));
  if (!surface.success) return { ...previous, error: { code: 'invalid' } };
  const phone = text(formData, 'phone');

  if (text(formData, 'change')) return { step: 'phone', phone };

  try {
    if (text(formData, 'step') !== 'code') {
      const result = await requestCode({ surface: surface.data, phone });
      return result.ok ? { step: 'code', phone } : { step: 'phone', phone, error: result.error };
    }
    const result = await verifyCode({ surface: surface.data, phone, code: text(formData, 'code') });
    if (!result.ok) return { step: 'code', phone, error: result.error };
    await setSessionCookie(surface.data, result.data.token);
  } catch (error) {
    log.error('signInAction failed', { action: 'signInAction', surface: surface.data, error });
    return { ...previous, error: { code: 'unexpected' } };
  }
  redirect(safeNext(surface.data, text(formData, 'next')));
}

/** Sign out of one surface (FR-009). */
export async function signOutAction(formData: FormData): Promise<void> {
  const parsed = z.enum(surfaces).safeParse(formData.get('surface'));
  if (!parsed.success) return;
  const surface = parsed.data;
  const token = await readSessionToken(surface);
  if (token) await signOut(token);
  await clearSessionCookie(surface);
  redirect(surface === 'customer' ? SURFACE_HOME.customer : SURFACE_LOGIN[surface]);
}

export type NameState = { saved?: boolean; error?: ResultError };

export async function updateCustomerNameAction(_previous: NameState, formData: FormData): Promise<NameState> {
  const session = await getOptionalSession('customer');
  if (!session) return { error: { code: 'unauthorised' } };
  try {
    const result = await updateCustomerName({ customerId: session.subjectId }, { displayName: text(formData, 'displayName') });
    if (!result.ok) return { error: result.error };
  } catch (error) {
    log.error('updateCustomerNameAction failed', { action: 'updateCustomerNameAction', surface: 'customer', subjectId: session.subjectId, error });
    return { error: { code: 'unexpected' } };
  }
  revalidatePath('/account');
  return { saved: true };
}
