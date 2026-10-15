import { describe, expect, it } from 'vitest';
import { standInPaymentProvider } from './stand-in';

describe('STAND-IN payment provider', () => {
  it('always confirms UPI with a DEMO reference and charges nothing', async () => {
    await expect(standInPaymentProvider.confirmUpi({ orderRef: '1042', amountRupees: 330 })).resolves.toEqual({
      status: 'succeeded',
      reference: 'DEMO-UPI-1042',
    });
  });

  it('is deterministic', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => standInPaymentProvider.confirmUpi({ orderRef: '7', amountRupees: 1 })),
    );
    expect(results.every((r) => r.status === 'succeeded')).toBe(true);
  });
});
