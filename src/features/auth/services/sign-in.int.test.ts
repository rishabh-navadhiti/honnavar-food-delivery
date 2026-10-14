import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/shared/db/client';
import { agents, customers, sessions } from '@/shared/db/schema';
import { makeAdmin, makeAgent, makeKitchen, makeSignin, truncateAll } from '@/shared/db/test/helpers';
import { loadSession } from '../session-store';
import { requestCode, signOut, updateCustomerName, verifyCode } from './sign-in';

beforeEach(truncateAll);

const CODE = process.env.DEMO_OTP_CODE ?? '123456';

describe('requestCode', () => {
  it('rejects a malformed phone number', async () => {
    expect(await requestCode({ surface: 'customer', phone: '12345' })).toEqual({
      ok: false,
      error: { code: 'invalid', fieldErrors: { phone: 'invalidPhone' } },
    });
  });

  it('accepts any valid number for customers', async () => {
    expect(await requestCode({ surface: 'customer', phone: '+91 98765 43210' })).toEqual({ ok: true, data: { codeSent: true } });
  });

  it('refuses numbers not registered for partner, agent or admin', async () => {
    for (const surface of ['partner', 'agent', 'admin'] as const) {
      expect(await requestCode({ surface, phone: '9876543210' })).toEqual({ ok: false, error: { code: 'not_registered' } });
    }
  });

  it('refuses a kitchen contact number that is not on the sign-in list (FR-053)', async () => {
    await makeKitchen({}, { contactPhone: '9000004444' });
    expect(await requestCode({ surface: 'partner', phone: '9000004444' })).toEqual({
      ok: false,
      error: { code: 'not_registered' },
    });
  });

  it('refuses an inactive agent', async () => {
    const agent = await makeAgent({ active: false });
    expect(await requestCode({ surface: 'agent', phone: agent.phone })).toEqual({ ok: false, error: { code: 'inactive' } });
  });

  it('accepts registered partner, agent and admin numbers', async () => {
    const kitchen = await makeKitchen();
    const signin = await makeSignin(kitchen.id);
    const agent = await makeAgent();
    const admin = await makeAdmin();
    expect((await requestCode({ surface: 'partner', phone: signin.phone })).ok).toBe(true);
    expect((await requestCode({ surface: 'agent', phone: agent.phone })).ok).toBe(true);
    expect((await requestCode({ surface: 'admin', phone: admin.phone })).ok).toBe(true);
  });
});

describe('verifyCode', () => {
  it('creates the customer on first sign-in and returns a session token (FR-005)', async () => {
    const result = await verifyCode({ surface: 'customer', phone: '9876543210', code: CODE });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(await db.$count(customers, eq(customers.phone, '9876543210'))).toBe(1);
    expect((await loadSession('customer', result.data.token))?.phone).toBe('9876543210');
    // Signing in again reuses the same customer.
    await verifyCode({ surface: 'customer', phone: '9876543210', code: CODE });
    expect(await db.$count(customers)).toBe(1);
  });

  it('rejects a wrong code without creating anything', async () => {
    expect(await verifyCode({ surface: 'customer', phone: '9876543210', code: '000000' })).toEqual({
      ok: false,
      error: { code: 'wrong_code' },
    });
    expect(await db.$count(customers)).toBe(0);
    expect(await db.$count(sessions)).toBe(0);
  });

  it('rejects a malformed code', async () => {
    const result = await verifyCode({ surface: 'customer', phone: '9876543210', code: '12' });
    expect(result).toEqual({ ok: false, error: { code: 'invalid', fieldErrors: { code: 'invalidCode' } } });
  });

  it('creates partner sessions scoped to the kitchen of the sign-in number', async () => {
    const kitchen = await makeKitchen();
    const signin = await makeSignin(kitchen.id);
    const result = await verifyCode({ surface: 'partner', phone: signin.phone, code: CODE });
    if (!result.ok) throw new Error(result.error.code);
    const session = await loadSession('partner', result.data.token);
    expect(session).toMatchObject({ subjectId: signin.id, kitchenId: kitchen.id });
  });

  it('creates agent and admin sessions', async () => {
    const agent = await makeAgent();
    const admin = await makeAdmin();
    const a = await verifyCode({ surface: 'agent', phone: agent.phone, code: CODE });
    const b = await verifyCode({ surface: 'admin', phone: admin.phone, code: CODE });
    expect(a.ok && (await loadSession('agent', a.data.token))?.subjectId).toBe(agent.id);
    expect(b.ok && (await loadSession('admin', b.data.token))?.subjectId).toBe(admin.id);
  });

  it('re-checks registration at verification time', async () => {
    const agent = await makeAgent();
    expect((await requestCode({ surface: 'agent', phone: agent.phone })).ok).toBe(true);
    await db.update(agents).set({ active: false }).where(eq(agents.id, agent.id));
    expect(await verifyCode({ surface: 'agent', phone: agent.phone, code: CODE })).toEqual({
      ok: false,
      error: { code: 'inactive' },
    });
  });
});

describe('signOut', () => {
  it('deletes the session', async () => {
    const result = await verifyCode({ surface: 'customer', phone: '9876543210', code: CODE });
    if (!result.ok) throw new Error(result.error.code);
    await signOut(result.data.token);
    expect(await loadSession('customer', result.data.token)).toBeNull();
  });
});

describe('updateCustomerName', () => {
  it('trims the name and allows clearing it', async () => {
    const [customer] = await db.insert(customers).values({ phone: '9876543210' }).returning();
    expect(await updateCustomerName({ customerId: customer!.id }, { displayName: '  Asha  ' })).toEqual({
      ok: true,
      data: { displayName: 'Asha' },
    });
    expect((await updateCustomerName({ customerId: customer!.id }, { displayName: '' })).ok).toBe(true);
    const [row] = await db.select().from(customers);
    expect(row!.displayName).toBeNull();
  });

  it('limits the name to 60 characters', async () => {
    const [customer] = await db.insert(customers).values({ phone: '9876543210' }).returning();
    const result = await updateCustomerName({ customerId: customer!.id }, { displayName: 'x'.repeat(61) });
    expect(result).toEqual({ ok: false, error: { code: 'invalid', fieldErrors: { displayName: 'tooLong' } } });
  });
});
