import { describe, expect, it } from 'vitest';
import { canTransition, isFinal, type LifecycleActor, type OrderAction, type OrderState, type OrderStatus } from './lifecycle';

const AGENT_A = '00000000-0000-4000-8000-00000000000a';
const AGENT_B = '00000000-0000-4000-8000-00000000000b';

const order = (status: OrderStatus, agentId: string | null = null, paymentMethod: 'cod' | 'upi_demo' = 'cod'): OrderState => ({
  status,
  agentId,
  paymentMethod,
});
const customer: LifecycleActor = { role: 'customer' };
const partner: LifecycleActor = { role: 'partner' };
const admin: LifecycleActor = { role: 'admin' };
const system: LifecycleActor = { role: 'system' };
const agentA: LifecycleActor = { role: 'agent', agentId: AGENT_A };
const agentB: LifecycleActor = { role: 'agent', agentId: AGENT_B };

const ALL: OrderStatus[] = ['placed', 'accepted', 'rejected', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'];

function expectOk(state: OrderState, action: OrderAction, actor: LifecycleActor) {
  const result = canTransition(state, action, actor);
  if (!result.ok) throw new Error(`expected ok, got ${result.code}`);
  return result.next;
}
function expectCode(state: OrderState, action: OrderAction, actor: LifecycleActor) {
  const result = canTransition(state, action, actor);
  if (result.ok) throw new Error(`expected a refusal, got ${result.next.status}`);
  return result.code;
}

describe('canTransition: the allowed arrows (FR-017)', () => {
  it('partner accepts or rejects a placed order', () => {
    expect(expectOk(order('placed'), { type: 'accept' }, partner)).toEqual({ status: 'accepted', agentId: null, event: 'accepted' });
    expect(expectOk(order('placed'), { type: 'reject' }, partner)).toMatchObject({ status: 'rejected', event: 'rejected' });
  });

  it('the system rejects an overdue placed order', () => {
    expect(expectOk(order('placed'), { type: 'expire' }, system)).toMatchObject({ status: 'rejected', event: 'rejected' });
  });

  it('customer or admin cancels a placed order', () => {
    expect(expectOk(order('placed'), { type: 'cancel' }, customer)).toMatchObject({ status: 'cancelled', event: 'cancelled' });
    expect(expectOk(order('placed'), { type: 'cancel' }, admin)).toMatchObject({ status: 'cancelled' });
  });

  it('partner moves accepted → preparing → ready, keeping any agent', () => {
    expect(expectOk(order('accepted', AGENT_A), { type: 'preparing' }, partner)).toEqual({
      status: 'preparing',
      agentId: AGENT_A,
      event: 'preparing',
    });
    expect(expectOk(order('preparing'), { type: 'ready' }, partner)).toMatchObject({ status: 'ready', event: 'ready' });
  });

  it('the assigned agent picks up a ready order and delivers it', () => {
    expect(expectOk(order('ready', AGENT_A), { type: 'pickup' }, agentA)).toEqual({
      status: 'picked_up',
      agentId: AGENT_A,
      event: 'picked_up',
    });
    expect(expectOk(order('picked_up', AGENT_A, 'upi_demo'), { type: 'deliver' }, agentA)).toMatchObject({
      status: 'delivered',
      event: 'delivered',
    });
    expect(
      expectOk(order('picked_up', AGENT_A, 'cod'), { type: 'deliver', cashConfirmed: true }, agentA),
    ).toMatchObject({ status: 'delivered' });
  });

  it('admin cancels from every non-final status, keeping the agent for the record', () => {
    for (const status of ['placed', 'accepted', 'preparing', 'ready', 'picked_up'] as const) {
      const agentId = status === 'placed' ? null : AGENT_A;
      expect(expectOk(order(status, agentId), { type: 'cancel' }, admin)).toEqual({
        status: 'cancelled',
        agentId,
        event: 'cancelled',
      });
    }
  });
});

describe('canTransition: assignment (FR-016, FR-034)', () => {
  it('assigns an active agent from acceptance until ready, without changing the status', () => {
    for (const status of ['accepted', 'preparing', 'ready'] as const) {
      expect(expectOk(order(status), { type: 'assign', agentId: AGENT_A, agentActive: true }, admin)).toEqual({
        status,
        agentId: AGENT_A,
        event: 'assigned',
        previousAgentId: null,
      });
    }
  });

  it('a second assignment is a reassignment that records the previous agent', () => {
    expect(expectOk(order('preparing', AGENT_A), { type: 'assign', agentId: AGENT_B, agentActive: true }, admin)).toEqual({
      status: 'preparing',
      agentId: AGENT_B,
      event: 'reassigned',
      previousAgentId: AGENT_A,
    });
  });

  it('refuses inactive agents, the same agent, and statuses outside accepted–ready', () => {
    expect(expectCode(order('accepted'), { type: 'assign', agentId: AGENT_A, agentActive: false }, admin)).toBe('agent_inactive');
    expect(expectCode(order('ready', AGENT_A), { type: 'assign', agentId: AGENT_A, agentActive: true }, admin)).toBe('same_agent');
    for (const status of ['placed', 'picked_up', 'delivered', 'rejected', 'cancelled'] as const) {
      expect(expectCode(order(status, status === 'placed' || status === 'rejected' ? null : AGENT_A), { type: 'assign', agentId: AGENT_B, agentActive: true }, admin)).toBe(
        'not_assignable',
      );
    }
  });

  it('only admins assign', () => {
    expect(expectCode(order('accepted'), { type: 'assign', agentId: AGENT_A, agentActive: true }, partner)).toBe('unauthorised');
  });
});

describe('canTransition: refusals', () => {
  it('a customer cannot cancel once the kitchen has accepted', () => {
    expect(expectCode(order('accepted'), { type: 'cancel' }, customer)).toBe('order_moved_on');
  });

  it('a partner cannot cancel, and nobody but the partner moves the kitchen steps', () => {
    expect(expectCode(order('placed'), { type: 'cancel' }, partner)).toBe('unauthorised');
    expect(expectCode(order('placed'), { type: 'accept' }, admin)).toBe('unauthorised');
    expect(expectCode(order('accepted'), { type: 'preparing' }, agentA)).toBe('unauthorised');
    expect(expectCode(order('placed'), { type: 'expire' }, partner)).toBe('unauthorised');
  });

  it('kitchen steps out of order are refused as moved on', () => {
    expect(expectCode(order('cancelled'), { type: 'accept' }, partner)).toBe('order_moved_on');
    expect(expectCode(order('accepted'), { type: 'ready' }, partner)).toBe('order_moved_on');
    expect(expectCode(order('accepted'), { type: 'expire' }, system)).toBe('order_moved_on');
  });

  it('pickup needs ready and the acting agent', () => {
    expect(expectCode(order('preparing', AGENT_A), { type: 'pickup' }, agentA)).toBe('not_ready');
    expect(expectCode(order('accepted', AGENT_A), { type: 'pickup' }, agentA)).toBe('not_ready');
    expect(expectCode(order('ready', AGENT_A), { type: 'pickup' }, agentB)).toBe('not_found');
    expect(expectCode(order('ready'), { type: 'pickup' }, agentA)).toBe('not_found');
    expect(expectCode(order('picked_up', AGENT_A), { type: 'pickup' }, agentA)).toBe('order_moved_on');
  });

  it('delivering cash on delivery needs the cash confirmation', () => {
    expect(expectCode(order('picked_up', AGENT_A, 'cod'), { type: 'deliver' }, agentA)).toBe('cash_not_confirmed');
    expect(expectCode(order('ready', AGENT_A), { type: 'deliver', cashConfirmed: true }, agentA)).toBe('order_moved_on');
    expect(expectCode(order('picked_up', AGENT_A), { type: 'deliver', cashConfirmed: true }, agentB)).toBe('not_found');
  });

  it('final statuses refuse everything', () => {
    const actions: [OrderAction, LifecycleActor][] = [
      [{ type: 'accept' }, partner],
      [{ type: 'reject' }, partner],
      [{ type: 'preparing' }, partner],
      [{ type: 'ready' }, partner],
      [{ type: 'cancel' }, admin],
      [{ type: 'cancel' }, customer],
      [{ type: 'expire' }, system],
    ];
    for (const status of ALL.filter(isFinal)) {
      for (const [action, actor] of actions) expect(canTransition(order(status), action, actor).ok).toBe(false);
    }
  });

  it('isFinal marks delivered, rejected and cancelled', () => {
    expect(ALL.filter(isFinal)).toEqual(['rejected', 'delivered', 'cancelled']);
  });
});
