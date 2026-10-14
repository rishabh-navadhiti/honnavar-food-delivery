import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { loadSession, SESSION_LIFETIME_DAYS, type Session } from './session-store';
import { SESSION_COOKIE, SURFACE_LOGIN, type Surface } from './surfaces';

/**
 * The current request's session for a surface, or null. Wrapped in React `cache()` so the layout,
 * the page and its components share one database check per request.
 */
export const getOptionalSession = cache(async (surface: Surface): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE[surface])?.value;
  if (!token) return null;
  return loadSession(surface, token);
});

/**
 * Every page under a `(protected)` route group calls this itself (layouts do not re-run on every
 * navigation). Redirects to that surface's sign-in screen when there is no valid session.
 */
export const requireSession = cache(async (surface: Surface): Promise<Session> => {
  const session = await getOptionalSession(surface);
  if (!session) redirect(SURFACE_LOGIN[surface]);
  return session;
});

/** Only callable from server actions and route handlers (cookies are read-only during render). */
export async function setSessionCookie(surface: Surface, token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE[surface], token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_LIFETIME_DAYS * 86_400,
  });
}

export async function readSessionToken(surface: Surface): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE[surface])?.value;
}

export async function clearSessionCookie(surface: Surface): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE[surface]);
}
