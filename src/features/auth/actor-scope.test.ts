import { describe, expect, it } from 'vitest';
import { resolveKitchenScope, type Actor } from './actor-scope';

const partner: Actor = { role: 'partner', phone: '9000000301', signinId: 's1', kitchenId: 'k1' };
const admin: Actor = { role: 'admin', phone: '9000000001', adminId: 'a1' };

describe('resolveKitchenScope', () => {
  it('pins partners to their own kitchen', () => {
    expect(resolveKitchenScope(partner)).toEqual({ ok: true, data: 'k1' });
    expect(resolveKitchenScope(partner, 'k1')).toEqual({ ok: true, data: 'k1' });
    expect(resolveKitchenScope(partner, 'k2')).toEqual({ ok: false, error: { code: 'unauthorised' } });
  });

  it('lets admins act on the kitchen they name', () => {
    expect(resolveKitchenScope(admin, 'k2')).toEqual({ ok: true, data: 'k2' });
    expect(resolveKitchenScope(admin).ok).toBe(false);
  });
});
