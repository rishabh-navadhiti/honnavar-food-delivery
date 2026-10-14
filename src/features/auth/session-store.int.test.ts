import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/shared/db/client';
import { admins, agents, kitchenSignins, sessions } from '@/shared/db/schema';
import { makeAdmin, makeAgent, makeKitchen, makeSignin, truncateAll } from '@/shared/db/test/helpers';
import { createSession, deleteSessionsForSubject, hashToken, loadSession, SESSION_LIFETIME_DAYS } from './session-store';

beforeEach(truncateAll);

const DAY = 86_400_000;

describe('session store', () => {
  it('stores only the SHA-256 hash of the token', async () => {
    const admin = await makeAdmin();
    const { token } = await createSession({ surface: 'admin', phone: admin.phone, subjectId: admin.id, kitchenId: null });
    const rows = await db.select().from(sessions);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.tokenHash).toBe(hashToken(token));
    expect(rows[0]!.tokenHash).not.toBe(token);
  });

  it('loads a valid session and extends its expiry', async () => {
    const admin = await makeAdmin();
    const start = new Date('2026-10-12T06:30:00Z');
    const { token } = await createSession(
      { surface: 'admin', phone: admin.phone, subjectId: admin.id, kitchenId: null },
      start,
    );
    const later = new Date(start.getTime() + 10 * DAY);
    const session = await loadSession('admin', token, later);
    expect(session?.subjectId).toBe(admin.id);
    const [row] = await db.select().from(sessions);
    expect(row!.expiresAt.getTime()).toBe(later.getTime() + SESSION_LIFETIME_DAYS * DAY);
  });

  it('rejects and deletes an expired session', async () => {
    const admin = await makeAdmin();
    const start = new Date('2026-10-12T06:30:00Z');
    const { token } = await createSession(
      { surface: 'admin', phone: admin.phone, subjectId: admin.id, kitchenId: null },
      start,
    );
    expect(await loadSession('admin', token, new Date(start.getTime() + 31 * DAY))).toBeNull();
    expect(await db.$count(sessions)).toBe(0);
  });

  it('rejects a token on a different surface', async () => {
    const kitchen = await makeKitchen();
    const signin = await makeSignin(kitchen.id);
    const { token } = await createSession({
      surface: 'partner',
      phone: signin.phone,
      subjectId: signin.id,
      kitchenId: kitchen.id,
    });
    expect(await loadSession('agent', token)).toBeNull();
    expect(await loadSession('partner', token)).not.toBeNull();
  });

  it('ends an agent session once the agent is inactive', async () => {
    const agent = await makeAgent();
    const { token } = await createSession({ surface: 'agent', phone: agent.phone, subjectId: agent.id, kitchenId: null });
    expect(await loadSession('agent', token)).not.toBeNull();
    await db.update(agents).set({ active: false }).where(eq(agents.id, agent.id));
    expect(await loadSession('agent', token)).toBeNull();
    expect(await db.$count(sessions)).toBe(0);
  });

  it('ends a partner session when the number leaves the sign-in list or moves kitchen', async () => {
    const kitchen = await makeKitchen();
    const other = await makeKitchen();
    const signin = await makeSignin(kitchen.id);
    const subject = { surface: 'partner' as const, phone: signin.phone, subjectId: signin.id, kitchenId: kitchen.id };

    const moved = await createSession(subject);
    await db.update(kitchenSignins).set({ kitchenId: other.id }).where(eq(kitchenSignins.id, signin.id));
    expect(await loadSession('partner', moved.token)).toBeNull();

    await db.update(kitchenSignins).set({ kitchenId: kitchen.id }).where(eq(kitchenSignins.id, signin.id));
    const removed = await createSession(subject);
    await db.delete(kitchenSignins).where(eq(kitchenSignins.id, signin.id));
    expect(await loadSession('partner', removed.token)).toBeNull();
  });

  it('ends an admin session when the admin is removed', async () => {
    const admin = await makeAdmin();
    const { token } = await createSession({ surface: 'admin', phone: admin.phone, subjectId: admin.id, kitchenId: null });
    await db.delete(admins).where(eq(admins.id, admin.id));
    expect(await loadSession('admin', token)).toBeNull();
  });

  it('deletes every session of a subject', async () => {
    const agent = await makeAgent();
    const subject = { surface: 'agent' as const, phone: agent.phone, subjectId: agent.id, kitchenId: null };
    await createSession(subject);
    await createSession(subject);
    await deleteSessionsForSubject('agent', agent.id);
    expect(await db.$count(sessions)).toBe(0);
  });

  it('returns null for an unknown token', async () => {
    expect(await loadSession('customer', 'nope')).toBeNull();
  });
});
