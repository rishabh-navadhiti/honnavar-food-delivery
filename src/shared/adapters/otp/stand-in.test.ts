import { describe, expect, it } from 'vitest';
import { createStandInOtpProvider } from './stand-in';

describe('STAND-IN OTP provider', () => {
  const provider = createStandInOtpProvider('123456');

  it('accepts every code request without sending anything', async () => {
    await expect(provider.requestCode('9876543210')).resolves.toEqual({ ok: true });
  });

  it('accepts only the fixed demo code', async () => {
    await expect(provider.verifyCode('9876543210', '123456')).resolves.toEqual({ ok: true });
    await expect(provider.verifyCode('9876543210', '654321')).resolves.toEqual({ ok: false, reason: 'wrong_code' });
  });

  it('is deterministic', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => provider.verifyCode('9876543210', '123456')));
    expect(results.every((r) => r.ok)).toBe(true);
  });
});
