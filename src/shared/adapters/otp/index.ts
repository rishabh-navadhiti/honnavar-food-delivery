import 'server-only';
import { env } from '../../env';
import { createStandInOtpProvider } from './stand-in';
import type { OtpProvider } from './types';

export type { OtpProvider } from './types';

/** The OTP provider in use. Currently the declared STAND-IN (see ./stand-in.ts). */
export const otpProvider: OtpProvider = createStandInOtpProvider(env.DEMO_OTP_CODE);
