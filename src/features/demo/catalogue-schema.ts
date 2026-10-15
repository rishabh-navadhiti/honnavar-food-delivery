import { z } from 'zod';
import { normalizePhone } from '../auth/domain/phone';
import { emptyWeek, toMinutes, validateWeekHours, WEEKDAYS, type WeekHours } from '../kitchens/domain/hours';

/**
 * The demo catalogue (seed/catalogue.json): seed CONTENT, kept separate from seed logic so the
 * researched catalogue can replace the stand-in without code changes (research R15).
 * Pure: no server-only, so e2e/catalogue.ts can parse it too.
 */

const phone = z.string().refine((v) => normalizePhone(v) === v, 'must be a normalised 10-digit mobile number');
const key = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be kebab-case');
const text = (max: number) => z.string().trim().max(max);

const localized = (max: number) =>
  z
    .object({ en: text(max).optional(), kn: text(max).optional() })
    .refine((v) => Boolean(v.en || v.kn), 'needs at least one language');
const localizedOptional = (max: number) => z.object({ en: text(max).optional(), kn: text(max).optional() });

const range = z.object({ opens: z.string(), closes: z.string() });
const dayKeys = ['everyDay', '1', '2', '3', '4', '5', '6', '7'] as const;
const hoursInput = z.partialRecord(z.enum(dayKeys), z.array(range));

/** Turn catalogue hours ("everyDay" plus per-day overrides, "HH:MM") into WeekHours in minutes. */
export function catalogueHoursToWeek(input: z.infer<typeof hoursInput>): WeekHours | null {
  const week = emptyWeek();
  for (const day of WEEKDAYS) {
    const ranges = input[String(day) as (typeof dayKeys)[number]] ?? input.everyDay ?? [];
    const converted = ranges.map((r) => ({ opens: toMinutes(r.opens), closes: toMinutes(r.closes) }));
    if (converted.some((r) => r.opens === null || r.closes === null)) return null;
    week[day] = converted as { opens: number; closes: number }[];
  }
  return Object.keys(validateWeekHours(week)).length === 0 ? week : null;
}

const dish = z.object({
  key,
  name: localized(80),
  description: localizedOptional(300).optional(),
  priceRupees: z.number().int().min(1).max(100000),
  isVeg: z.boolean(),
  available: z.boolean().default(true),
  image: z.string().optional(),
});

const category = z.object({ key, name: localized(60), dishes: z.array(dish).min(1) });

const kitchen = z
  .object({
    key,
    name: localized(80),
    description: localizedOptional(300).optional(),
    type: z.enum(['restaurant', 'home_kitchen', 'cloud_kitchen']),
    pureVeg: z.boolean(),
    address: text(200).min(1),
    landmark: text(100).min(1),
    contacts: z
      .array(z.object({ phone, isPrimary: z.boolean().default(false) }))
      .min(1)
      .refine((c) => c.filter((x) => x.isPrimary).length === 1, 'exactly one primary contact'),
    signins: z.array(z.object({ phone, personName: text(60).min(1) })).min(1),
    hours: hoursInput.refine((h) => catalogueHoursToWeek(h) !== null, 'invalid hours'),
    status: z.enum(['pending', 'active', 'suspended']),
    suspensionReason: text(200).optional(),
    verification: z
      .object({ kind: z.enum(['fssai_licence', 'hygiene_check']), reference: text(40).min(3) })
      .optional(),
    temporarilyClosedAtReset: z.boolean().default(false),
    menuSource: z.enum(['researched', 'fabricated']),
    sourceNote: z.string().optional(),
    image: z.string().optional(),
    categories: z.array(category),
  })
  .superRefine((k, ctx) => {
    if (k.status === 'active' && !k.verification) {
      ctx.addIssue({ code: 'custom', message: 'an active kitchen needs a verification' });
    }
    if (k.status === 'suspended' && !k.suspensionReason) {
      ctx.addIssue({ code: 'custom', message: 'a suspended kitchen needs a suspensionReason' });
    }
    if (k.verification) {
      const expected = k.type === 'home_kitchen' ? 'hygiene_check' : 'fssai_licence';
      if (k.verification.kind !== expected) {
        ctx.addIssue({ code: 'custom', message: `verification kind must be ${expected}` });
      }
      if (expected === 'fssai_licence' && !/^\d{14}$/.test(k.verification.reference)) {
        ctx.addIssue({ code: 'custom', message: 'an FSSAI licence number has 14 digits' });
      }
    }
    if (k.pureVeg && k.categories.some((c) => c.dishes.some((d) => !d.isVeg))) {
      ctx.addIssue({ code: 'custom', message: 'a pure-veg kitchen cannot have non-veg dishes' });
    }
  });

export const catalogueSchema = z
  .object({
    notes: z.array(z.string()).optional(),
    admins: z.array(z.object({ key, name: text(60).min(1), phone })).min(1),
    agents: z.array(
      z.object({
        key,
        name: text(60).min(1),
        phone,
        vehicleType: z.enum(['bicycle', 'two_wheeler', 'other']),
        vehicleReg: text(20).optional(),
        active: z.boolean().default(true),
      }),
    ),
    customers: z.array(z.object({ key, phone, displayName: text(60).optional() })),
    kitchens: z.array(kitchen).min(1),
  })
  .superRefine((c, ctx) => {
    const signinPhones = c.kitchens.flatMap((k) => k.signins.map((s) => s.phone));
    if (new Set(signinPhones).size !== signinPhones.length) {
      ctx.addIssue({ code: 'custom', message: 'a sign-in number may belong to only one kitchen' });
    }
    const kitchenKeys = c.kitchens.map((k) => k.key);
    if (new Set(kitchenKeys).size !== kitchenKeys.length) {
      ctx.addIssue({ code: 'custom', message: 'kitchen keys must be unique' });
    }
  });

export type Catalogue = z.infer<typeof catalogueSchema>;
export type CatalogueKitchen = Catalogue['kitchens'][number];
export type CatalogueDish = CatalogueKitchen['categories'][number]['dishes'][number];
