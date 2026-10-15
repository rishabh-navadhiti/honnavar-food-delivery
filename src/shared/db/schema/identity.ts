import { boolean, char, index, pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const vehicleType = pgEnum('vehicle_type', ['bicycle', 'two_wheeler', 'other']);
export const surface = pgEnum('surface', ['customer', 'partner', 'agent', 'admin']);

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: varchar('phone', { length: 10 }).notNull().unique(),
  displayName: varchar('display_name', { length: 60 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const admins = pgTable('admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: varchar('phone', { length: 10 }).notNull().unique(),
  name: varchar('name', { length: 60 }).notNull(),
});

export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: varchar('phone', { length: 10 }).notNull().unique(),
  name: varchar('name', { length: 60 }).notNull(),
  vehicleType: vehicleType('vehicle_type').notNull(),
  vehicleReg: varchar('vehicle_reg', { length: 20 }),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  'sessions',
  {
    tokenHash: char('token_hash', { length: 64 }).primaryKey(),
    surface: surface('surface').notNull(),
    phone: varchar('phone', { length: 10 }).notNull(),
    subjectId: uuid('subject_id').notNull(),
    kitchenId: uuid('kitchen_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('sessions_surface_subject_idx').on(t.surface, t.subjectId)],
);
