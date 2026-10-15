import { z } from 'zod';
import { normalizePhone } from './domain/phone';
import { surfaces } from './surfaces';

export const surfaceSchema = z.enum(surfaces);

/** A mobile number as typed; normalised to 10 digits or rejected with `invalidPhone`. */
export const phoneSchema = z
  .string({ error: 'invalidPhone' })
  .transform((value, ctx) => {
    const phone = normalizePhone(value);
    if (!phone) {
      ctx.addIssue({ code: 'custom', message: 'invalidPhone' });
      return z.NEVER;
    }
    return phone;
  });

export const codeSchema = z.string({ error: 'invalidCode' }).trim().regex(/^\d{6}$/, { error: 'invalidCode' });

export const requestCodeSchema = z.object({ surface: surfaceSchema, phone: phoneSchema });
export const verifyCodeSchema = z.object({ surface: surfaceSchema, phone: phoneSchema, code: codeSchema });
export const customerNameSchema = z.object({
  displayName: z.string().trim().max(60, { error: 'tooLong' }),
});
