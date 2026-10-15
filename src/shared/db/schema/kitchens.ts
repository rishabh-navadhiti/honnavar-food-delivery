import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { admins } from './identity';
import { images } from './images';

export const kitchenType = pgEnum('kitchen_type', ['restaurant', 'home_kitchen', 'cloud_kitchen']);
export const kitchenStatus = pgEnum('kitchen_status', ['pending', 'active', 'suspended']);
export const actorRole = pgEnum('actor_role', ['admin', 'partner']);
export const verificationKind = pgEnum('verification_kind', ['fssai_licence', 'hygiene_check']);

export const kitchens = pgTable(
  'kitchens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nameEn: varchar('name_en', { length: 80 }),
    nameKn: varchar('name_kn', { length: 80 }),
    descriptionEn: varchar('description_en', { length: 300 }),
    descriptionKn: varchar('description_kn', { length: 300 }),
    type: kitchenType('type').notNull(),
    pureVeg: boolean('pure_veg').notNull(),
    address: varchar('address', { length: 200 }).notNull(),
    landmark: varchar('landmark', { length: 100 }).notNull(),
    photoImageId: uuid('photo_image_id').references(() => images.id, { onDelete: 'set null' }),
    status: kitchenStatus('status').notNull().default('pending'),
    suspensionReason: varchar('suspension_reason', { length: 200 }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    reopensAt: timestamp('reopens_at', { withTimezone: true }),
    closureUpdatedByRole: actorRole('closure_updated_by_role'),
    closureUpdatedByPhone: varchar('closure_updated_by_phone', { length: 10 }),
    closureUpdatedAt: timestamp('closure_updated_at', { withTimezone: true }),
    hoursUpdatedByRole: actorRole('hours_updated_by_role'),
    hoursUpdatedByPhone: varchar('hours_updated_by_phone', { length: 10 }),
    hoursUpdatedAt: timestamp('hours_updated_at', { withTimezone: true }),
    /** Map location set by an admin (002 FR-037); both or neither. */
    locationLat: numeric('location_lat', { precision: 9, scale: 6, mode: 'number' }),
    locationLng: numeric('location_lng', { precision: 9, scale: 6, mode: 'number' }),
    /** Preparation minutes for the expected delivery time (002 FR-057). */
    prepMinutes: smallint('prep_minutes').notNull().default(25),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'kitchens_name_present',
      sql`coalesce(btrim(${t.nameEn}), '') <> '' or coalesce(btrim(${t.nameKn}), '') <> ''`,
    ),
    check(
      'kitchens_location_pair',
      sql`(${t.locationLat} is null) = (${t.locationLng} is null)`,
    ),
    check(
      'kitchens_location_range',
      sql`${t.locationLat} is null or (${t.locationLat} between 6 and 37 and ${t.locationLng} between 68 and 98)`,
    ),
    check('kitchens_prep_minutes', sql`${t.prepMinutes} between 5 and 120`),
    check(
      'kitchens_suspension_reason',
      sql`${t.status} <> 'suspended' or coalesce(btrim(${t.suspensionReason}), '') <> ''`,
    ),
  ],
);

export const kitchenContacts = pgTable(
  'kitchen_contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kitchenId: uuid('kitchen_id')
      .notNull()
      .references(() => kitchens.id, { onDelete: 'cascade' }),
    phone: varchar('phone', { length: 10 }).notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    position: smallint('position').notNull().default(0),
  },
  (t) => [uniqueIndex('kitchen_contacts_one_primary').on(t.kitchenId).where(sql`${t.isPrimary}`)],
);

export const kitchenSignins = pgTable('kitchen_signins', {
  id: uuid('id').primaryKey().defaultRandom(),
  kitchenId: uuid('kitchen_id')
    .notNull()
    .references(() => kitchens.id, { onDelete: 'cascade' }),
  phone: varchar('phone', { length: 10 }).notNull().unique(),
  personName: varchar('person_name', { length: 60 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const kitchenHours = pgTable(
  'kitchen_hours',
  {
    kitchenId: uuid('kitchen_id')
      .notNull()
      .references(() => kitchens.id, { onDelete: 'cascade' }),
    /** ISO weekday: 1 = Monday … 7 = Sunday */
    weekday: smallint('weekday').notNull(),
    slot: smallint('slot').notNull(),
    opensMin: smallint('opens_min').notNull(),
    closesMin: smallint('closes_min').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.kitchenId, t.weekday, t.slot] }),
    check('kitchen_hours_weekday', sql`${t.weekday} between 1 and 7`),
    check('kitchen_hours_slot', sql`${t.slot} in (1, 2)`),
    check('kitchen_hours_opens', sql`${t.opensMin} between 0 and 1439`),
    check('kitchen_hours_closes', sql`${t.closesMin} between 1 and 1440`),
    check('kitchen_hours_order', sql`${t.opensMin} < ${t.closesMin}`),
  ],
);

export const verifications = pgTable('verifications', {
  kitchenId: uuid('kitchen_id')
    .primaryKey()
    .references(() => kitchens.id, { onDelete: 'cascade' }),
  kind: verificationKind('kind').notNull(),
  reference: varchar('reference', { length: 40 }).notNull(),
  verifiedByAdminId: uuid('verified_by_admin_id')
    .notNull()
    .references(() => admins.id),
  verifiedAt: timestamp('verified_at', { withTimezone: true }).notNull().defaultNow(),
});
