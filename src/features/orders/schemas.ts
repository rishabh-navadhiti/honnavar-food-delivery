import { z } from 'zod';
import { fields } from '@/shared/validation';

export const PARTNER_REASONS = ['kitchen_busy', 'item_unavailable', 'kitchen_closing', 'other'] as const;
export const ADMIN_REASONS = ['customer_request', 'kitchen_issue', 'no_agent', 'delivery_problem', 'other'] as const;

export const orderIdSchema = z.object({ orderId: fields.id() });

/** A reason from a fixed list, with a note of at most 200 characters, required for "other" (FR-019). */
function reasonSchema<R extends readonly [string, ...string[]]>(reasons: R) {
  return z
    .object({ orderId: fields.id(), reason: z.enum(reasons, { error: 'required' }), note: fields.optionalText(200) })
    .superRefine((value, ctx) => {
      if (value.reason === 'other' && !value.note) ctx.addIssue({ code: 'custom', message: 'noteRequired', path: ['note'] });
    });
}

export const rejectSchema = reasonSchema(PARTNER_REASONS);
export const adminCancelSchema = reasonSchema(ADMIN_REASONS);
