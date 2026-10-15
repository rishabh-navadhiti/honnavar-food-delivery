import { z } from 'zod';
import { fields } from '@/shared/validation';
import { phoneSchema } from '../auth/schemas';
import { localizedOptional, localizedRequired } from '../menu/schemas';

const contact = z.object({ phone: phoneSchema, isPrimary: z.boolean() });
const signin = z.object({ phone: phoneSchema, personName: fields.requiredText(60) });

const uniquePhones = (list: { phone: string }[]) => new Set(list.map((x) => x.phone)).size === list.length;

/** Admin-managed kitchen profile (FR-019). Contacts are customer-facing and never grant sign-in. */
export const kitchenProfileSchema = z.object({
  name: localizedRequired(80),
  description: localizedOptional(300).default({ en: null, kn: null }),
  type: z.enum(['restaurant', 'home_kitchen', 'cloud_kitchen'], { error: 'required' }),
  pureVeg: z.boolean(),
  address: fields.requiredText(200),
  landmark: fields.requiredText(100),
  contacts: z
    .array(contact)
    .min(1, { error: 'contactRequired' })
    .refine((c) => c.filter((x) => x.isPrimary).length === 1, { error: 'primaryContactRequired' })
    .refine(uniquePhones, { error: 'duplicatePhone' }),
});

export const signinListSchema = z
  .array(signin)
  .min(1, { error: 'signinRequired' })
  .refine(uniquePhones, { error: 'duplicatePhone' });

export const signinSchema = signin;

export const statusSchema = z.object({
  kitchenId: z.uuid(),
  status: z.enum(['pending', 'active', 'suspended']),
  reason: z.string().trim().max(200, { error: 'tooLong' }).optional(),
});

export type KitchenProfileInput = z.input<typeof kitchenProfileSchema>;
