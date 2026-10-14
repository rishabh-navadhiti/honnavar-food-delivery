import { z } from 'zod';

const part = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: 'tooLong' })
    .nullish()
    .transform((v) => (v ? v : null));

/** Partner-authored content as a language pair, at least one language required (FR-016). */
export const localizedRequired = (max: number) =>
  z
    .object({ en: part(max), kn: part(max) })
    .refine((v) => Boolean(v.en || v.kn), { error: 'nameRequired' });

export const localizedOptional = (max: number) => z.object({ en: part(max), kn: part(max) });

const id = z.uuid({ error: 'invalid' });

export const categorySchema = z.object({
  kitchenId: id.nullish(),
  id: id.optional(),
  name: localizedRequired(60),
});

const price = z
  .number({ error: 'priceRange' })
  .int({ error: 'priceRange' })
  .min(1, { error: 'priceRange' })
  .max(100000, { error: 'priceRange' });

export const dishSchema = z.object({
  kitchenId: id.nullish(),
  id: id.optional(),
  categoryId: id,
  name: localizedRequired(80),
  description: localizedOptional(300).default({ en: null, kn: null }),
  priceRupees: price,
  isVeg: z.boolean(),
  available: z.boolean(),
  /** undefined keeps the current photo; null removes it; bytes replace it. */
  photo: z.custom<Buffer>((v) => Buffer.isBuffer(v)).nullish(),
});

export type DishInput = z.input<typeof dishSchema>;
