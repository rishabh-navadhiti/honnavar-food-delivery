'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { clearSessionCookie, readSessionToken } from './session';
import { deleteSession } from './session-store';
import { SURFACE_HOME, SURFACE_LOGIN, surfaces } from './surfaces';

const signOutInput = z.object({ surface: z.enum(surfaces) });

/** Sign out of one surface (FR-009). */
export async function signOutAction(formData: FormData): Promise<void> {
  const parsed = signOutInput.safeParse({ surface: formData.get('surface') });
  if (!parsed.success) return;
  const { surface } = parsed.data;
  const token = await readSessionToken(surface);
  if (token) await deleteSession(token);
  await clearSessionCookie(surface);
  redirect(surface === 'customer' ? SURFACE_HOME.customer : SURFACE_LOGIN[surface]);
}
