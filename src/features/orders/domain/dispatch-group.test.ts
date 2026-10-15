import { describe, expect, it } from 'vitest';
import { DISPATCH_GROUPS, dispatchGroup } from './dispatch-group';

const A = '00000000-0000-4000-8000-00000000000a';

describe('dispatchGroup (FR-033)', () => {
  it('lists the five groups in board order', () => {
    expect(DISPATCH_GROUPS).toEqual(['waiting_kitchen', 'needs_agent', 'assigned', 'out_for_delivery', 'finished']);
  });

  it('maps every status and agent combination', () => {
    expect(dispatchGroup({ status: 'placed', agentId: null })).toBe('waiting_kitchen');
    for (const status of ['accepted', 'preparing', 'ready'] as const) {
      expect(dispatchGroup({ status, agentId: null })).toBe('needs_agent');
      expect(dispatchGroup({ status, agentId: A })).toBe('assigned');
    }
    expect(dispatchGroup({ status: 'picked_up', agentId: A })).toBe('out_for_delivery');
    for (const status of ['delivered', 'rejected', 'cancelled'] as const) {
      expect(dispatchGroup({ status, agentId: status === 'rejected' ? null : A })).toBe('finished');
    }
  });
});
