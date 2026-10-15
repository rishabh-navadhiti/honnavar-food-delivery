export type VerificationKind = 'fssai_licence' | 'hygiene_check';

/** Checking a partner's FSSAI licence or hygiene-check reference (Principle III). */
export interface VerificationProvider {
  check(input: { kind: VerificationKind; reference: string }): Promise<
    { status: 'recorded' } | { status: 'rejected'; reason: string }
  >;
}
