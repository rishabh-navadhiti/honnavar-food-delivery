import { describe, expect, it } from 'vitest';
import { standInVerificationProvider } from './stand-in';

describe('STAND-IN verification provider', () => {
  it('records every reference without a lookup', async () => {
    await expect(
      standInVerificationProvider.check({ kind: 'fssai_licence', reference: '12345678901234' }),
    ).resolves.toEqual({ status: 'recorded' });
    await expect(
      standInVerificationProvider.check({ kind: 'hygiene_check', reference: 'HC-2026-014' }),
    ).resolves.toEqual({ status: 'recorded' });
  });
});
