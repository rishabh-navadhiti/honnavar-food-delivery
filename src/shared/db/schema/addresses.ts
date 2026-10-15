import { sql } from 'drizzle-orm';
import {
  char,
  check,
  customType,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { customers } from './identity';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

export const addressLabel = pgEnum('address_label', ['home', 'work', 'other']);

/** Landmark voice notes, stored as recorded (research R9). Served only to the people who need them. */
export const audioClips = pgTable('audio_clips', {
  id: uuid('id').primaryKey().defaultRandom(),
  sha256: char('sha256', { length: 64 }).notNull().unique(),
  /** audio/webm, audio/ogg or audio/mp4 */
  mime: varchar('mime', { length: 40 }).notNull(),
  bytes: bytea('bytes').notNull(),
  byteSize: integer('byte_size').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Coordinates within India (data-model.md). */
export const latLngColumn = (name: string) => numeric(name, { precision: 9, scale: 6, mode: 'number' });

export const customerAddresses = pgTable(
  'customer_addresses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    label: addressLabel('label').notNull(),
    /** The customer's name for an "Other" address (FR-054, amended); null otherwise. */
    labelText: varchar('label_text', { length: 30 }),
    house: varchar('house', { length: 100 }).notNull(),
    street: varchar('street', { length: 150 }),
    landmark: varchar('landmark', { length: 100 }).notNull(),
    riderNote: varchar('rider_note', { length: 200 }),
    voiceNoteId: uuid('voice_note_id').references(() => audioClips.id, { onDelete: 'set null' }),
    lat: latLngColumn('lat').notNull(),
    lng: latLngColumn('lng').notNull(),
    geocodedText: varchar('geocoded_text', { length: 300 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('customer_addresses_customer_idx').on(t.customerId),
    check('customer_addresses_lat', sql`${t.lat} between 6 and 37`),
    check('customer_addresses_lng', sql`${t.lng} between 68 and 98`),
  ],
);
