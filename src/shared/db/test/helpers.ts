import { sql } from 'drizzle-orm';
import { db } from '../client';
import {
  admins,
  agents,
  customerAddresses,
  customers,
  orderEvents,
  orderItems,
  orders,
  dishes,
  kitchenContacts,
  kitchenHours,
  kitchens,
  kitchenSignins,
  menuCategories,
} from '../schema';

export const testDb = db;

let phoneCounter = 0;
/** A unique, valid 10-digit test phone number (91111xxxxx block). */
export function testPhone(): string {
  phoneCounter += 1;
  return `91111${String(phoneCounter).padStart(5, '0')}`;
}

export async function truncateAll(): Promise<void> {
  await db.execute(sql`
    truncate table messages, order_events, order_items, orders, customer_addresses, audio_clips,
      sessions, dishes, menu_categories, verifications, kitchen_hours, kitchen_signins,
      kitchen_contacts, kitchens, images, agents, admins, customers restart identity cascade
  `);
  await db.execute(sql`alter sequence order_number_seq restart with 1001`);
}

export async function makeAdmin(overrides: Partial<typeof admins.$inferInsert> = {}) {
  const [row] = await db
    .insert(admins)
    .values({ phone: testPhone(), name: 'Test Admin', ...overrides })
    .returning();
  return row!;
}

export async function makeAgent(overrides: Partial<typeof agents.$inferInsert> = {}) {
  const [row] = await db
    .insert(agents)
    .values({ phone: testPhone(), name: 'Test Agent', vehicleType: 'two_wheeler', ...overrides })
    .returning();
  return row!;
}

type HoursRow = { weekday: number; slot: number; opensMin: number; closesMin: number };

/** Default hours: every day 11:00–15:00 and 18:00–22:00. */
export const defaultHours: HoursRow[] = [1, 2, 3, 4, 5, 6, 7].flatMap((weekday) => [
  { weekday, slot: 1, opensMin: 660, closesMin: 900 },
  { weekday, slot: 2, opensMin: 1080, closesMin: 1320 },
]);

export async function makeKitchen(
  overrides: Partial<typeof kitchens.$inferInsert> = {},
  options: { hours?: HoursRow[]; contactPhone?: string } = {},
) {
  const [kitchen] = await db
    .insert(kitchens)
    .values({
      nameEn: 'Test Kitchen',
      nameKn: 'ಪರೀಕ್ಷಾ ಅಡುಗೆಮನೆ',
      type: 'restaurant',
      pureVeg: false,
      address: 'Main Road, Honnavar',
      landmark: 'Near bus stand',
      status: 'active',
      ...overrides,
    })
    .returning();
  await db
    .insert(kitchenContacts)
    .values({ kitchenId: kitchen!.id, phone: options.contactPhone ?? testPhone(), isPrimary: true });
  const hours = options.hours ?? defaultHours;
  if (hours.length > 0) {
    await db.insert(kitchenHours).values(hours.map((h) => ({ kitchenId: kitchen!.id, ...h })));
  }
  return kitchen!;
}

export async function makeSignin(kitchenId: string, overrides: Partial<typeof kitchenSignins.$inferInsert> = {}) {
  const [row] = await db
    .insert(kitchenSignins)
    .values({ kitchenId, phone: testPhone(), personName: 'Test Owner', ...overrides })
    .returning();
  return row!;
}

export async function makeCategory(kitchenId: string, overrides: Partial<typeof menuCategories.$inferInsert> = {}) {
  const [row] = await db
    .insert(menuCategories)
    .values({ kitchenId, nameEn: 'Meals', nameKn: 'ಊಟ', ...overrides })
    .returning();
  return row!;
}

export async function makeDish(
  kitchenId: string,
  categoryId: string,
  overrides: Partial<typeof dishes.$inferInsert> = {},
) {
  const [row] = await db
    .insert(dishes)
    .values({
      kitchenId,
      categoryId,
      nameEn: 'Neer dose',
      nameKn: 'ನೀರ್ ದೋಸೆ',
      priceRupees: 60,
      isVeg: true,
      ...overrides,
    })
    .returning();
  return row!;
}

export async function makeCustomer(overrides: Partial<typeof customers.$inferInsert> = {}) {
  const [row] = await db
    .insert(customers)
    .values({ phone: testPhone(), displayName: 'Test Customer', ...overrides })
    .returning();
  return row!;
}

export async function makeAddress(customerId: string, overrides: Partial<typeof customerAddresses.$inferInsert> = {}) {
  const [row] = await db
    .insert(customerAddresses)
    .values({
      customerId,
      label: 'home',
      house: 'Door 1-23',
      landmark: 'Behind the temple',
      lat: 14.2845,
      lng: 74.451,
      ...overrides,
    })
    .returning();
  return row!;
}

/** Open around the clock, every day. */
export const allDayHours: HoursRow[] = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  weekday,
  slot: 1,
  opensMin: 0,
  closesMin: 1440,
}));

/**
 * An active kitchen with a location, a category and two available dishes (₹60 veg, ₹180 non-veg).
 * `open: true` (default) gives 00:00–24:00 hours so tests do not depend on the time of day.
 */
export async function makeKitchenWithMenu(
  options: { open?: boolean; overrides?: Partial<typeof kitchens.$inferInsert> } = {},
) {
  const kitchen = await makeKitchen(
    { locationLat: 14.28, locationLng: 74.4445, prepMinutes: 25, ...options.overrides },
    { hours: options.open === false ? [] : allDayHours },
  );
  const category = await makeCategory(kitchen.id);
  const veg = await makeDish(kitchen.id, category.id, { nameEn: 'Neer dose', nameKn: 'ನೀರ್ ದೋಸೆ', priceRupees: 60, isVeg: true });
  const nonVeg = await makeDish(kitchen.id, category.id, {
    nameEn: 'Fish thali',
    nameKn: 'ಮೀನು ಊಟ',
    priceRupees: 180,
    isVeg: false,
    position: 1,
  });
  return { kitchen, category, dishes: [veg, nonVeg] as const };
}

type OrderStatusValue = (typeof orders.$inferInsert)['status'] & string;
const FINAL_STATUSES = new Set(['delivered', 'rejected', 'cancelled']);

/**
 * Insert an order directly in a given state, with one item, a valid address snapshot and the events
 * for that state. Creates the customer, kitchen and address when not given.
 */
export async function makeOrder(
  options: {
    status?: OrderStatusValue;
    customerId?: string;
    kitchenId?: string;
    agentId?: string | null;
    placedAt?: Date;
    paymentMethod?: 'cod' | 'upi_demo';
    voiceNoteId?: string | null;
    addressId?: string | null;
  } = {},
) {
  const status = options.status ?? 'placed';
  const placedAt = options.placedAt ?? new Date();
  const customerId = options.customerId ?? (await makeCustomer()).id;
  const kitchenId = options.kitchenId ?? (await makeKitchenWithMenu()).kitchen.id;
  const needsAgent = ['picked_up', 'delivered'].includes(status);
  const agentId = options.agentId !== undefined ? options.agentId : needsAgent ? (await makeAgent()).id : null;
  const paymentMethod = options.paymentMethod ?? 'cod';
  const [order] = await db
    .insert(orders)
    .values({
      customerId,
      kitchenId,
      placeKey: crypto.randomUUID(),
      status,
      paymentMethod,
      paymentReference: paymentMethod === 'upi_demo' ? 'DEMO-UPI-TEST' : null,
      itemTotal: 120,
      deliveryFee: 30,
      grandTotal: 150,
      expectedAt: new Date(placedAt.getTime() + 40 * 60_000),
      agentId,
      assignedAt: agentId ? placedAt : null,
      reason: status === 'rejected' ? 'kitchen_busy' : null,
      cashCollected: status === 'delivered' && paymentMethod === 'cod' ? 150 : null,
      addressId: options.addressId ?? null,
      addrLabel: 'home',
      addrHouse: 'Door 1-23',
      addrLandmark: 'Behind the temple',
      addrRiderNote: 'Ring twice',
      addrLat: 14.2845,
      addrLng: 74.451,
      addrVoiceNoteId: options.voiceNoteId ?? null,
      placedAt,
      statusChangedAt: placedAt,
      finishedAt: FINAL_STATUSES.has(status) ? placedAt : null,
    })
    .returning();
  await db.insert(orderItems).values({
    orderId: order!.id,
    position: 0,
    nameEn: 'Neer dose',
    nameKn: 'ನೀರ್ ದೋಸೆ',
    isVeg: true,
    priceRupees: 60,
    quantity: 2,
    lineTotal: 120,
  });
  // Events a second apart, so the history has a stable order.
  const at = (seconds: number) => new Date(placedAt.getTime() + seconds * 1000);
  await db.insert(orderEvents).values({ orderId: order!.id, kind: 'placed', actor: 'customer', at: at(0) });
  if (agentId) {
    await db.insert(orderEvents).values({ orderId: order!.id, kind: 'assigned', actor: 'admin', agentId, at: at(1) });
  }
  if (status !== 'placed') {
    const actor = status === 'cancelled' ? 'admin' : status === 'picked_up' || status === 'delivered' ? 'agent' : 'partner';
    await db.insert(orderEvents).values({ orderId: order!.id, kind: status, actor, at: at(2) });
  }
  return order!;
}
