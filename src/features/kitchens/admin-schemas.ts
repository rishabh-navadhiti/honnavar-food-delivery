import { z } from 'zod';
import { fields } from '@/shared/validation';
import { phoneSchema } from '../auth/schemas';
import { localizedOptional, localizedRequired } from '../menu/schemas';

const contact = z.object({ phone: phoneSchema, isPrimary: z.boolean() });

/** Map location within India (002 FR-037); null clears it, absent leaves it unchanged. */
const location = z.object({
  lat: z.coerce.number({ error: 'invalid' }).min(6, { error: 'invalid' }).max(37, { error: 'invalid' }),
  lng: z.coerce.number({ error: 'invalid' }).min(68, { error: 'invalid' }).max(98, { error: 'invalid' }),
});
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
  location: location.nullable().optional(),
  /** Preparation minutes for the expected delivery time (002 FR-057). */
  prepMinutes: z.coerce.number({ error: 'invalid' }).int({ error: 'invalid' }).min(5, { error: 'prepMinutesRange' }).max(120, { error: 'prepMinutesRange' }).optional(),
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
