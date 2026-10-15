/**
 * STAND-IN: no registry lookup; always 'recorded'.
 *
 * Declared in spec 001 (FR-021) and docs/fidelity-matrix.md ("Admin onboarding of partners and
 * agents"). The admin records a reference; nothing is checked with FSSAI. Format validation lives in
 * the action schema, so it stays when a real adapter replaces this one in ./index.ts.
 */
import type { VerificationProvider } from './types';

export const standInVerificationProvider: VerificationProvider = {
  async check() {
    return { status: 'recorded' };
  },
};
