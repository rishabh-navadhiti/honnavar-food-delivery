import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/shared/db/client';
import { agents, sessions } from '@/shared/db/schema';
import { adminActor } from '@/shared/db/test/actors';
import { makeAgent, truncateAll } from '@/shared/db/test/helpers';
import { createSession } from '../../auth/session-store';
import { saveAgent, setAgentActive } from './agents';

beforeEach(truncateAll);

describe('agents (FR-026, FR-027, FR-007)', () => {
  it('creates and edits agents, uppercasing the registration', async () => {
    const admin = await adminActor();
    const created = await saveAgent(admin, { name: 'Prakash', phone: '90000 07001', vehicleType: 'two_wheeler', vehicleReg: 'ka47 h 1' });
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    const [row] = await db.select().from(agents).where(eq(agents.id, created.data.id));
    expect(row).toMatchObject({ phone: '9000007001', vehicleReg: 'KA47 H 1', active: true });
    expect((await saveAgent(admin, { id: created.data.id, name: 'Prakash N', phone: '9000007001', vehicleType: 'bicycle' })).ok).toBe(true);
  });

  it('validates name, vehicle type and registration length', async () => {
    const admin = await adminActor();
    const result = await saveAgent(admin, {
      name: 'x'.repeat(61),
      phone: '9000007001',
      vehicleType: 'truck' as 'other',
      vehicleReg: 'x'.repeat(21),
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.error.fieldErrors ?? {}).sort()).toEqual(['name', 'vehicleReg', 'vehicleType']);
  });

  it('refuses a phone already registered to another agent', async () => {
    const admin = await adminActor();
    await makeAgent({ phone: '9000007001', name: 'Suresh' });
    expect(await saveAgent(admin, { name: 'New', phone: '9000007001', vehicleType: 'bicycle' })).toEqual({
      ok: false,
      error: { code: 'agent_phone_taken', details: { agentName: 'Suresh' } },
    });
  });

  it('deactivating an agent ends their sessions', async () => {
    const admin = await adminActor();
    const agent = await makeAgent();
    await createSession({ surface: 'agent', phone: agent.phone, subjectId: agent.id, kitchenId: null });
    expect((await setAgentActive(admin, { id: agent.id, active: false })).ok).toBe(true);
    expect(await db.$count(sessions)).toBe(0);
  });
});
