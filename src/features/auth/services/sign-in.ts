import 'server-only';
import { eq } from 'drizzle-orm';
import { otpProvider } from '@/shared/adapters/otp';
import { db } from '@/shared/db/client';
import { admins, agents, customers, kitchenSignins } from '@/shared/db/schema';
import { err, ok, type Result } from '@/shared/result';
import { parseInput } from '@/shared/validation';
import { customerNameSchema, requestCodeSchema, verifyCodeSchema } from '../schemas';
import { createSession, deleteSession, type SessionSubject } from '../session-store';
import type { Surface } from '../surfaces';

type Registration = { subjectId: string; kitchenId: string | null } | { refused: 'not_registered' | 'inactive' };

/**
 * Who may sign in where (FR-005, FR-006, FR-007, FR-053): any number as a customer; partners only via
 * a kitchen's sign-in list (never a contact number); agents only while active; admins from demo data.
 * Customers have no registration until their first successful sign-in.
 */
async function findRegistration(surface: Exclude<Surface, 'customer'>, phone: string): Promise<Registration> {
  if (surface === 'partner') {
    const [row] = await db.select().from(kitchenSignins).where(eq(kitchenSignins.phone, phone));
    return row ? { subjectId: row.id, kitchenId: row.kitchenId } : { refused: 'not_registered' };
  }
  if (surface === 'agent') {
    const [row] = await db.select().from(agents).where(eq(agents.phone, phone));
    if (!row) return { refused: 'not_registered' };
    return row.active ? { subjectId: row.id, kitchenId: null } : { refused: 'inactive' };
  }
  const [row] = await db.select().from(admins).where(eq(admins.phone, phone));
  return row ? { subjectId: row.id, kitchenId: null } : { refused: 'not_registered' };
}

export async function requestCode(input: { surface: string; phone: string }): Promise<Result<{ codeSent: true }>> {
  const parsed = parseInput(requestCodeSchema, input);
  if (!parsed.ok) return parsed;
  const { surface, phone } = parsed.data;
  if (surface !== 'customer') {
    const registration = await findRegistration(surface, phone);
    if ('refused' in registration) return err(registration.refused);
  }
  const sent = await otpProvider.requestCode(phone);
  return sent.ok ? ok({ codeSent: true }) : err('unexpected');
}

/** Check the code, re-check registration, and open a session. Returns the raw session token. */
export async function verifyCode(input: {
  surface: string;
  phone: string;
  code: string;
}): Promise<Result<{ token: string; surface: Surface }>> {
  const parsed = parseInput(verifyCodeSchema, input);
  if (!parsed.ok) return parsed;
  const { surface, phone, code } = parsed.data;

  let subject: SessionSubject;
  if (surface === 'customer') {
    subject = { surface, phone, subjectId: '', kitchenId: null };
  } else {
    const registration = await findRegistration(surface, phone);
    if ('refused' in registration) return err(registration.refused);
    subject = { surface, phone, subjectId: registration.subjectId, kitchenId: registration.kitchenId };
  }

  const checked = await otpProvider.verifyCode(phone, code);
  if (!checked.ok) return err('wrong_code');

  if (surface === 'customer') {
    await db.insert(customers).values({ phone }).onConflictDoNothing({ target: customers.phone });
    const [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.phone, phone));
    subject.subjectId = customer!.id;
  }

  const { token } = await createSession(subject);
  return ok({ token, surface });
}

export async function signOut(token: string): Promise<void> {
  await deleteSession(token);
}

export async function updateCustomerName(
  actor: { customerId: string },
  input: { displayName: string },
): Promise<Result<{ displayName: string | null }>> {
  const parsed = parseInput(customerNameSchema, input);
  if (!parsed.ok) return parsed;
  const displayName = parsed.data.displayName || null;
  await db.update(customers).set({ displayName }).where(eq(customers.id, actor.customerId));
  return ok({ displayName });
}
