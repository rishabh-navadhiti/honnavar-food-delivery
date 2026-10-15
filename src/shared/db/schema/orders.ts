import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgSequence,
  pgTable,
  primaryKey,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { addressLabel, audioClips, customerAddresses, latLngColumn } from './addresses';
import { agents, customers } from './identity';
import { kitchens } from './kitchens';
import { dishes } from './menu';

export const orderStatus = pgEnum('order_status', [
  'placed',
  'accepted',
  'rejected',
  'preparing',
  'ready',
  'picked_up',
  'delivered',
  'cancelled',
]);
export const paymentMethod = pgEnum('payment_method', ['cod', 'upi_demo']);
export const orderReason = pgEnum('order_reason', [
  'kitchen_busy',
  'item_unavailable',
  'kitchen_closing',
  'kitchen_no_response',
  'customer_request',
  'kitchen_issue',
  'no_agent',
  'delivery_problem',
  'other',
]);
export const orderEventKind = pgEnum('order_event_kind', [
  'placed',
  'accepted',
  'rejected',
  'preparing',
  'ready',
  'assigned',
  'reassigned',
  'picked_up',
  'delivered',
  'cancelled',
]);
export const orderActor = pgEnum('order_actor', ['customer', 'partner', 'agent', 'admin', 'system']);

/** Short, human-readable order numbers shown as #1042 (research R6). */
export const orderNumberSeq = pgSequence('order_number_seq', { startWith: 1001 });

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderNo: integer('order_no')
      .notNull()
      .unique()
      .default(sql`nextval('order_number_seq')`),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    kitchenId: uuid('kitchen_id')
      .notNull()
      .references(() => kitchens.id, { onDelete: 'restrict' }),
    placeKey: uuid('place_key').notNull(),
    status: orderStatus('status').notNull().default('placed'),
    paymentMethod: paymentMethod('payment_method').notNull(),
    paymentReference: varchar('payment_reference', { length: 40 }),
    itemTotal: integer('item_total').notNull(),
    deliveryFee: integer('delivery_fee').notNull(),
    grandTotal: integer('grand_total').notNull(),
    expectedAt: timestamp('expected_at', { withTimezone: true }).notNull(),
    agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'restrict' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }),
    reason: orderReason('reason'),
    reasonNote: varchar('reason_note', { length: 200 }),
    cashCollected: integer('cash_collected'),
    addressId: uuid('address_id').references(() => customerAddresses.id, { onDelete: 'set null' }),
    addrLabel: addressLabel('addr_label').notNull(),
    addrHouse: varchar('addr_house', { length: 100 }).notNull(),
    addrStreet: varchar('addr_street', { length: 150 }),
    addrLandmark: varchar('addr_landmark', { length: 100 }).notNull(),
    addrRiderNote: varchar('addr_rider_note', { length: 200 }),
    addrLat: latLngColumn('addr_lat').notNull(),
    addrLng: latLngColumn('addr_lng').notNull(),
    addrGeocodedText: varchar('addr_geocoded_text', { length: 300 }),
    addrVoiceNoteId: uuid('addr_voice_note_id').references(() => audioClips.id, { onDelete: 'restrict' }),
    placedAt: timestamp('placed_at', { withTimezone: true }).notNull(),
    statusChangedAt: timestamp('status_changed_at', { withTimezone: true }).notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('orders_customer_place_key').on(t.customerId, t.placeKey),
    index('orders_kitchen_placed_idx').on(t.kitchenId, t.placedAt),
    index('orders_customer_placed_idx').on(t.customerId, t.placedAt),
    index('orders_agent_idx').on(t.agentId),
    index('orders_status_idx').on(t.status),
    index('orders_placed_waiting_idx').on(t.placedAt).where(sql`${t.status} = 'placed'`),
    check(
      'orders_totals',
      sql`${t.grandTotal} = ${t.itemTotal} + ${t.deliveryFee} and ${t.itemTotal} >= 0 and ${t.deliveryFee} >= 0`,
    ),
    check('orders_rejected_reason', sql`${t.status} <> 'rejected' or ${t.reason} is not null`),
    check('orders_other_note', sql`${t.reason} is distinct from 'other' or coalesce(btrim(${t.reasonNote}), '') <> ''`),
    check('orders_cash', sql`${t.cashCollected} is null or ${t.cashCollected} = ${t.grandTotal}`),
    check('orders_agent_absent', sql`${t.status} not in ('placed', 'rejected') or ${t.agentId} is null`),
    check('orders_agent_present', sql`${t.status} not in ('picked_up', 'delivered') or ${t.agentId} is not null`),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    position: smallint('position').notNull(),
    dishId: uuid('dish_id').references(() => dishes.id, { onDelete: 'set null' }),
    nameEn: varchar('name_en', { length: 80 }),
    nameKn: varchar('name_kn', { length: 80 }),
    isVeg: boolean('is_veg').notNull(),
    priceRupees: integer('price_rupees').notNull(),
    quantity: smallint('quantity').notNull(),
    lineTotal: integer('line_total').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.orderId, t.position] }),
    check(
      'order_items_name_present',
      sql`coalesce(btrim(${t.nameEn}), '') <> '' or coalesce(btrim(${t.nameKn}), '') <> ''`,
    ),
    check('order_items_price', sql`${t.priceRupees} between 1 and 100000`),
    check('order_items_quantity', sql`${t.quantity} between 1 and 20`),
    check('order_items_line_total', sql`${t.lineTotal} = ${t.priceRupees} * ${t.quantity}`),
  ],
);

/** History of every change (FR-018), written in the same transaction as the change. */
export const orderEvents = pgTable(
  'order_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    kind: orderEventKind('kind').notNull(),
    actor: orderActor('actor').notNull(),
    actorPhone: varchar('actor_phone', { length: 10 }),
    agentId: uuid('agent_id').references(() => agents.id),
    previousAgentId: uuid('previous_agent_id').references(() => agents.id),
    reason: orderReason('reason'),
    reasonNote: varchar('reason_note', { length: 200 }),
    at: timestamp('at', { withTimezone: true }).notNull(),
  },
  (t) => [index('order_events_order_at_idx').on(t.orderId, t.at)],
);
