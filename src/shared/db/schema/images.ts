import { char, customType, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

export const images = pgTable('images', {
  id: uuid('id').primaryKey().defaultRandom(),
  sha256: char('sha256', { length: 64 }).notNull().unique(),
  /** WebP, 320 px wide */
  small: bytea('small').notNull(),
  /** WebP, 800 px wide */
  large: bytea('large').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
