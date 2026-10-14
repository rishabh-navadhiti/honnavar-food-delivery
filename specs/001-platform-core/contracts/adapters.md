# Contract: Integration Adapters

Constitution Principle III: each external dependency is reached through one adapter module with a
stable interface. Both adapters in this feature are **declared stand-ins**: they are deterministic,
never fail randomly, carry a `STAND-IN` header comment, and are listed in
`docs/fidelity-matrix.md`.

## OTP: `src/shared/adapters/otp/`

```ts
export interface OtpProvider {
  /** Ask the provider to deliver a one-time code to this phone. */
  requestCode(phone: Phone): Promise<{ ok: true } | { ok: false; reason: 'unavailable' }>;
  /** Check a code previously requested for this phone. */
  verifyCode(phone: Phone, code: string): Promise<{ ok: true } | { ok: false; reason: 'wrong_code' }>;
}
```

**Stand-in (`stand-in.ts`)**:
- `requestCode` always returns `{ ok: true }` and sends nothing.
- `verifyCode` returns `ok` only when `code === env.DEMO_OTP_CODE` (default `123456`).
- The sign-in screens state that the code is a demo code (FR-004). Tests rely on this behaviour.
- A real SMS provider later replaces only `index.ts`'s export. It would add expiry, attempt limits
  and the `unavailable` path, with no caller changes.

## Verification: `src/shared/adapters/verification/`

```ts
export type VerificationKind = 'fssai_licence' | 'hygiene_check';
export interface VerificationProvider {
  check(input: { kind: VerificationKind; reference: string }):
    Promise<{ status: 'recorded' } | { status: 'rejected'; reason: string }>;
}
```

**Stand-in (`stand-in.ts`)**:
- Always returns `{ status: 'recorded' }` without any registry lookup.
- Format validation (14-digit FSSAI number, hygiene reference length) happens in the action's Zod
  schema, not in the adapter, so it stays when a real adapter arrives.
- The admin screen labels the record as "recorded by admin, not checked with FSSAI". That label is
  an interface string with a translation key.
