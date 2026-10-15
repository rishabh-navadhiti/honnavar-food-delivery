import 'server-only';
import { standInPaymentProvider } from './stand-in';
import type { PaymentProvider } from './types';

export type { PaymentProvider } from './types';

/** The payment provider in use. Currently the declared STAND-IN (see ./stand-in.ts). */
export const paymentProvider: PaymentProvider = standInPaymentProvider;
