/**
 * STAND-IN: no payment provider is contacted and nothing is charged. Every UPI confirmation
 * succeeds with a DEMO-UPI reference; the confirmation sheet tells the customer it is a demo.
 *
 * Declared in spec 002 (FR-011) and docs/fidelity-matrix.md ("Payment (UPI, cash on delivery)").
 * Deterministic and never fails randomly. A real UPI provider replaces this module's export in
 * ./index.ts and adds the `failed` path; callers already handle it.
 */
import type { PaymentProvider } from './types';

export const standInPaymentProvider: PaymentProvider = {
  async confirmUpi({ orderRef }) {
    return { status: 'succeeded', reference: `DEMO-UPI-${orderRef}` };
  },
};
