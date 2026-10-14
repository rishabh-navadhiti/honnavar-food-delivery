import 'server-only';
import { standInVerificationProvider } from './stand-in';
import type { VerificationProvider } from './types';

export type { VerificationKind, VerificationProvider } from './types';

/** The verification provider in use. Currently the declared STAND-IN (see ./stand-in.ts). */
export const verificationProvider: VerificationProvider = standInVerificationProvider;
