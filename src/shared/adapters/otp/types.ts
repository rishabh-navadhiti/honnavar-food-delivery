/** Delivery and checking of one-time sign-in codes (Principle III: one adapter, stable interface). */
export interface OtpProvider {
  /** Ask the provider to deliver a one-time code to this phone. */
  requestCode(phone: string): Promise<{ ok: true } | { ok: false; reason: 'unavailable' }>;
  /** Check a code previously requested for this phone. */
  verifyCode(phone: string, code: string): Promise<{ ok: true } | { ok: false; reason: 'wrong_code' }>;
}
