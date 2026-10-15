import { z } from 'zod';
import { fields } from '@/shared/validation';

/** Coordinates within India (data-model.md); form posts send them as text. */
export const latitude = z.coerce.number({ error: 'invalid' }).min(6, { error: 'invalid' }).max(37, { error: 'invalid' });
export const longitude = z.coerce.number({ error: 'invalid' }).min(68, { error: 'invalid' }).max(98, { error: 'invalid' });

const checkbox = z
  .union([z.boolean(), z.literal('on'), z.literal('')])
  .optional()
  .transform((v) => v === true || v === 'on');

/** A saved delivery address (FR-054): limits from data-model.md "customer_addresses". */
export const addressSchema = z.object({
  id: fields.optionalId(),
  label: z.enum(['home', 'work', 'other'], { error: 'required' }),
  house: fields.requiredText(100),
  street: fields.optionalText(150),
  landmark: fields.requiredText(100),
  riderNote: fields.optionalText(200),
  lat: latitude,
  lng: longitude,
  geocodedText: fields.optionalText(300),
  removeVoiceNote: checkbox,
});
export type AddressInput = z.infer<typeof addressSchema>;
