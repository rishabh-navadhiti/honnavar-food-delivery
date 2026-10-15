/**
 * STAND-IN: no message is sent; accepts only env.DEMO_OTP_CODE.
 *
 * Declared in spec 001 (FR-004) and docs/fidelity-matrix.md ("Phone + OTP login").
 * Deterministic and never fails randomly. A real SMS provider replaces this module's export in
 * ./index.ts and adds expiry and attempt limits; callers do not change.
 */
import type { OtpProvider } from './types';

export function createStandInOtpProvider(fixedCode: string): OtpProvider {
  return {
    async requestCode() {
      return { ok: true };
    },
    async verifyCode(_phone, code) {
      return code === fixedCode ? { ok: true } : { ok: false, reason: 'wrong_code' };
    },
  };
}
