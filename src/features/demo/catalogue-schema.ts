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

/** A map location within India (002 data-model.md). */
const location = z.object({ lat: z.number().min(6).max(37), lng: z.number().min(68).max(98) });
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
    location,
    prepMinutes: z.number().int().min(5).max(120).default(25),
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

const PARTNER_REASONS = ['kitchen_busy', 'item_unavailable', 'kitchen_closing', 'other'];
const ADMIN_REASONS = ['customer_request', 'kitchen_issue', 'no_agent', 'delivery_problem', 'other'];

const address = z.object({
  key,
  label: z.enum(['home', 'work', 'other']),
  house: text(100).min(1),
  street: text(150).optional(),
  landmark: text(100).min(1),
  riderNote: text(200).optional(),
  location,
});

const order = z.object({
  key,
  customer: key,
  address: key,
  kitchen: key,
  items: z.array(z.object({ dish: key, quantity: z.number().int().min(1).max(20) })).min(1),
  payment: z.enum(['cod', 'upi_demo']),
  status: z.enum(['placed', 'accepted', 'rejected', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled']),
  agent: key.optional(),
  reason: z
    .enum(['kitchen_busy', 'item_unavailable', 'kitchen_closing', 'customer_request', 'kitchen_issue', 'no_agent', 'delivery_problem', 'other'])
    .optional(),
  reasonNote: text(200).optional(),
  cancelledBy: z.enum(['customer', 'admin']).optional(),
  placedMinutesBeforeReset: z.number().int().min(0).max(90),
});
export type CatalogueOrder = z.infer<typeof order>;

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
    customers: z.array(
      z.object({ key, phone, displayName: text(60).optional(), addresses: z.array(address).max(10).default([]) }),
    ),
    kitchens: z.array(kitchen).min(1),
    orders: z.array(order).default([]),
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
    checkOrders(c, ctx);
  });

/** Orders reference real customers, addresses, kitchens, dishes and active agents (research R15). */
function checkOrders(c: { customers: CatalogueCustomer[]; kitchens: { key: string; categories: { dishes: { key: string }[] }[] }[]; agents: { key: string; active: boolean }[]; orders: CatalogueOrder[] }, ctx: z.RefinementCtx) {
  const orderKeys = new Set<string>();
  c.orders.forEach((o, i) => {
    const at = (field: string) => ['orders', i, field];
    const issue = (message: string, field = 'key') => ctx.addIssue({ code: 'custom', message, path: at(field) });
    if (orderKeys.has(o.key)) issue('order keys must be unique');
    orderKeys.add(o.key);
    const customer = c.customers.find((x) => x.key === o.customer);
    if (!customer) issue(`unknown customer ${o.customer}`, 'customer');
    else if (!customer.addresses.some((a) => a.key === o.address)) issue(`unknown address ${o.address}`, 'address');
    const kitchen = c.kitchens.find((k) => k.key === o.kitchen);
    if (!kitchen) issue(`unknown kitchen ${o.kitchen}`, 'kitchen');
    else {
      const dishKeys = new Set(kitchen.categories.flatMap((cat) => cat.dishes.map((d) => d.key)));
      for (const item of o.items) if (!dishKeys.has(item.dish)) issue(`dish ${item.dish} is not in ${o.kitchen}`, 'items');
    }
    if (o.agent) {
      const agent = c.agents.find((a) => a.key === o.agent);
      if (!agent) issue(`unknown agent ${o.agent}`, 'agent');
      else if (!agent.active) issue('an order agent must be active', 'agent');
    }
    if ((o.status === 'picked_up' || o.status === 'delivered') && !o.agent) issue(`a ${o.status} order needs an agent`, 'agent');
    if (o.status === 'rejected' && !(o.reason && PARTNER_REASONS.includes(o.reason))) issue('a rejected order needs a partner reason', 'reason');
    if (o.status === 'cancelled') {
      if (!o.cancelledBy) issue('a cancelled order needs cancelledBy', 'cancelledBy');
      if (o.cancelledBy === 'admin' && !(o.reason && ADMIN_REASONS.includes(o.reason))) issue('an admin cancellation needs an admin reason', 'reason');
    }
    if (o.reason === 'other' && !o.reasonNote) issue('reason "other" needs a reasonNote', 'reasonNote');
    if (o.placedMinutesBeforeReset < 4 * seedSteps(o).length) {
      issue(`placedMinutesBeforeReset must be at least ${4 * seedSteps(o).length} for this status`, 'placedMinutesBeforeReset');
    }
  });
}

export type SeedStep = 'accept' | 'reject' | 'assign' | 'preparing' | 'ready' | 'pickup' | 'deliver' | 'cancel';

/**
 * The normal path from Placed to a seeded order's status, one step every 4 minutes (research R15).
 * An agent, when given, is assigned straight after acceptance. Admin cancellations happen after
 * acceptance; customer cancellations straight from Placed.
 */
export function seedSteps(o: Pick<CatalogueOrder, 'status' | 'agent' | 'cancelledBy'>): SeedStep[] {
  const assign: SeedStep[] = o.agent ? ['assign'] : [];
  switch (o.status) {
    case 'placed':
      return [];
    case 'accepted':
      return ['accept', ...assign];
    case 'rejected':
      return ['reject'];
    case 'preparing':
      return ['accept', ...assign, 'preparing'];
    case 'ready':
      return ['accept', ...assign, 'preparing', 'ready'];
    case 'picked_up':
      return ['accept', ...assign, 'preparing', 'ready', 'pickup'];
    case 'delivered':
      return ['accept', ...assign, 'preparing', 'ready', 'pickup', 'deliver'];
    case 'cancelled':
      return o.cancelledBy === 'admin' ? ['accept', ...assign, 'cancel'] : ['cancel'];
  }
}

export type Catalogue = z.infer<typeof catalogueSchema>;
export type CatalogueCustomer = Catalogue['customers'][number];
export type CatalogueAddress = CatalogueCustomer['addresses'][number];
export type CatalogueKitchen = Catalogue['kitchens'][number];
export type CatalogueDish = CatalogueKitchen['categories'][number]['dishes'][number];
