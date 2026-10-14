import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { and, eq, lt } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { admins, agents, customers, kitchenSignins, sessions } from '@/shared/db/schema';
import type { Surface } from './surfaces';

export const SESSION_LIFETIME_DAYS = 30;
const DAY_MS = 86_400_000;

export type SessionSubject = {
  surface: Surface;
  phone: string;
  /** customers.id, admins.id, agents.id or kitchen_signins.id */
  subjectId: string;
  /** Set only for partner sessions. */
  kitchenId: string | null;
};

export type Session = SessionSubject & { expiresAt: Date };

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(
  subject: SessionSubject,
  now: Date = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_DAYS * DAY_MS);
  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    surface: subject.surface,
    phone: subject.phone,
    subjectId: subject.subjectId,
    kitchenId: subject.kitchenId,
    createdAt: now,
    lastSeenAt: now,
    expiresAt,
  });
  return { token, expiresAt };
}

/** Does the registration behind this session still allow sign-in? (research R4) */
async function subjectStillQualifies(subject: SessionSubject): Promise<boolean> {
  switch (subject.surface) {
    case 'customer':
      return (await db.$count(customers, eq(customers.id, subject.subjectId))) > 0;
    case 'admin':
      return (await db.$count(admins, eq(admins.id, subject.subjectId))) > 0;
    case 'agent':
      return (await db.$count(agents, and(eq(agents.id, subject.subjectId), eq(agents.active, true)))) > 0;
    case 'partner':
      if (!subject.kitchenId) return false;
      return (
        (await db.$count(
          kitchenSignins,
          and(eq(kitchenSignins.id, subject.subjectId), eq(kitchenSignins.kitchenId, subject.kitchenId)),
        )) > 0
      );
  }
}

/**
 * Load a session for a surface. Expired sessions, and sessions whose registration no longer
 * qualifies (inactive agent, number removed from a sign-in list), are deleted and treated as missing.
 */
export async function loadSession(surface: Surface, token: string, now: Date = new Date()): Promise<Session | null> {
  const tokenHash = hashToken(token);
  const [row] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.tokenHash, tokenHash), eq(sessions.surface, surface)));
  if (!row) return null;

  const subject: SessionSubject = {
    surface: row.surface,
    phone: row.phone,
    subjectId: row.subjectId,
    kitchenId: row.kitchenId,
  };
  if (row.expiresAt <= now || !(await subjectStillQualifies(subject))) {
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    return null;
  }

  const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_DAYS * DAY_MS);
  await db.update(sessions).set({ lastSeenAt: now, expiresAt }).where(eq(sessions.tokenHash, tokenHash));
  return { ...subject, expiresAt };
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

export async function deleteSessionsForSubject(surface: Surface, subjectId: string): Promise<void> {
  await db.delete(sessions).where(and(eq(sessions.surface, surface), eq(sessions.subjectId, subjectId)));
}

export async function deleteExpiredSessions(now: Date = new Date()): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
}
